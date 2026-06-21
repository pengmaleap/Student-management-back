const pool = require("../config/database");

const validStatuses = [
  "present",
  "early",
  "on_time",
  "late",
  "on_leave",
  "missed",
  "absent",
  "early_leave",
];

const requestedDate = (req) => req.query.date || new Date().toISOString().slice(0, 10);

const getDashboard = async (req, res) => {
  const date = requestedDate(req);
  try {
    const [gender, overview, attendance, schedules, notes] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE gender = 'female')::int AS female,
        COUNT(*) FILTER (WHERE gender = 'male')::int AS male,
        COUNT(*) FILTER (WHERE gender NOT IN ('female', 'male'))::int AS other
        FROM students`),
      pool.query(`SELECT status, COUNT(*)::int AS count FROM attendance
        WHERE attendance_date = $1 GROUP BY status ORDER BY status`, [date]),
      pool.query(`SELECT a.id, a.attendance_date, a.status, a.check_in, a.check_out,
        a.note, s.id AS student_id, s.name, s.grade, s.student_code, s.avatar_url
        FROM attendance a JOIN students s ON s.id = a.student_id
        WHERE a.attendance_date = $1 ORDER BY s.name LIMIT 5`, [date]),
      pool.query(`SELECT * FROM schedules WHERE schedule_date = $1 ORDER BY start_time`, [date]),
      pool.query(`SELECT * FROM notes WHERE note_date <= $1 ORDER BY updated_at DESC LIMIT 4`, [date]),
    ]);

    res.json({
      date,
      gender: gender.rows[0],
      attendanceOverview: overview.rows,
      attendance: attendance.rows,
      schedules: schedules.rows,
      notes: notes.rows,
    });
  } catch (error) {
    console.error("Error loading dashboard:", error);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
};

const getAttendance = async (req, res) => {
  const date = requestedDate(req);
  const status = req.query.status;
  const search = req.query.search || "";
  try {
    const result = await pool.query(`SELECT a.id, a.attendance_date, a.status,
      a.check_in, a.check_out, a.note, s.id AS student_id, s.name, s.grade,
      s.student_code, s.avatar_url, s.gender, s.address
      FROM attendance a JOIN students s ON s.id = a.student_id
      WHERE a.attendance_date = $1
        AND ($2::text IS NULL OR a.status = $2)
        AND ($3::text = '' OR s.name ILIKE '%' || $3 || '%' OR s.student_code ILIKE '%' || $3 || '%')
      ORDER BY s.name`, [date, status || null, search]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error loading attendance:", error);
    res.status(500).json({ error: "Failed to load attendance" });
  }
};

const upsertAttendance = async (req, res) => {
  const { studentId, date, status, checkIn, checkOut, note } = req.body;
  if (!studentId || !date || !validStatuses.includes(status)) {
    return res.status(400).json({ error: "studentId, date, and a valid status are required" });
  }
  try {
    const result = await pool.query(`INSERT INTO attendance
      (student_id, attendance_date, status, check_in, check_out, note)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (student_id, attendance_date) DO UPDATE SET
        status = EXCLUDED.status, check_in = EXCLUDED.check_in,
        check_out = EXCLUDED.check_out, note = EXCLUDED.note, updated_at = NOW()
      RETURNING *`, [studentId, date, status, checkIn || null, checkOut || null, note || null]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error saving attendance:", error);
    res.status(500).json({ error: "Failed to save attendance" });
  }
};

const getSchedules = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM schedules WHERE schedule_date = $1 ORDER BY start_time",
      [requestedDate(req)],
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to load schedules" });
  }
};

const getNotes = async (req, res) => {
  const search = req.query.search || "";
  try {
    const result = await pool.query(`SELECT * FROM notes
      WHERE $1::text = '' OR title ILIKE '%' || $1 || '%' OR content ILIKE '%' || $1 || '%'
      ORDER BY updated_at DESC`, [search]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to load notes" });
  }
};

const createNote = async (req, res) => {
  const { title, content, category, color, noteDate } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: "Title is required" });
  try {
    const result = await pool.query(`INSERT INTO notes (title, content, category, color, note_date)
      VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE)) RETURNING *`,
    [title.trim(), content || "", category || "General", color || "#FFF1B8", noteDate || null]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to create note" });
  }
};

const updateNote = async (req, res) => {
  const { title, content, category, color, noteDate } = req.body;
  try {
    const result = await pool.query(`UPDATE notes SET title = $1, content = $2,
      category = $3, color = $4, note_date = $5, updated_at = NOW()
      WHERE id = $6 RETURNING *`,
    [title, content || "", category || "General", color || "#FFF1B8", noteDate, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "Note not found" });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to update note" });
  }
};

const deleteNote = async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM notes WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "Note not found" });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete note" });
  }
};

module.exports = {
  getDashboard,
  getAttendance,
  upsertAttendance,
  getSchedules,
  getNotes,
  createNote,
  updateNote,
  deleteNote,
};
