const pool = require("../config/database");

// Get all students
const getAllStudents = async (req, res) => {
  try {
    const search = req.query.search || "";
    const gender = req.query.gender;
    const classId = /^\d+$/.test(req.query.classId || "") ? Number(req.query.classId) : null;
    const result = await pool.query(`SELECT s.*, c.name AS class_name, c.code AS class_code
      FROM students s LEFT JOIN classes c ON c.id = s.class_id
      WHERE ($1::text = '' OR s.name ILIKE '%' || $1 || '%' OR s.student_code ILIKE '%' || $1 || '%')
        AND ($2::text IS NULL OR s.gender = $2)
        AND ($3::int IS NULL OR s.class_id = $3)
      ORDER BY s.name`, [search, gender || null, classId]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
};

// Get student by ID
const getStudentById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`SELECT s.*, c.name AS class_name, c.code AS class_code
      FROM students s LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({ error: "Failed to fetch student" });
  }
};

// Create new student
const createStudent = async (req, res) => {
  const { name, email, phone, address, gender, grade, classId, studentCode, avatarUrl } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO students (name, email, phone, address, gender, grade, class_id, student_code, avatar_url)
       VALUES ($1, $2, $3, $4, $5,
         COALESCE((SELECT name FROM classes WHERE id = $6), NULLIF($7, ''), 'Unassigned'),
         $6, $8, $9) RETURNING *`,
      [name, email, phone, address, gender || "other", classId || null, grade || null, studentCode, avatarUrl],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating student:", error);
    res.status(500).json({ error: "Failed to create student" });
  }
};

// Update student
const updateStudent = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address, gender, grade, classId, studentCode, avatarUrl } = req.body;
  try {
    const result = await pool.query(
      `UPDATE students SET name = $1, email = $2, phone = $3, address = $4,
       gender = $5,
       grade = COALESCE((SELECT name FROM classes WHERE id = $6), NULLIF($7, ''), 'Unassigned'),
       class_id = $6, student_code = $8, avatar_url = $9, updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [name, email, phone, address, gender || "other", classId || null, grade || null, studentCode, avatarUrl, id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating student:", error);
    res.status(500).json({ error: "Failed to update student" });
  }
};

// Delete student
const deleteStudent = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM students WHERE id = $1 RETURNING *",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }
    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({ error: "Failed to delete student" });
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
};
