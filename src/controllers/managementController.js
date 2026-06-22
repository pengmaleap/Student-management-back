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
const requestedClassId = (req) => {
  const value = req.query.classId;
  return /^\d+$/.test(value || "") ? Number(value) : null;
};

const getClasses = async (req, res) => {
  try {
    const result = await pool.query(`SELECT c.id, c.name, c.code, c.description,
      COUNT(s.id)::int AS student_count
      FROM classes c
      LEFT JOIN students s ON s.class_id = c.id
      GROUP BY c.id
      ORDER BY c.name`);
    res.json(result.rows);
  } catch (error) {
    console.error("Error loading classes:", error);
    res.status(500).json({ error: "Failed to load classes" });
  }
};

const initializeDailyData = async (req, res) => {
  const date = req.body.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    return res.status(400).json({ error: "A valid date in YYYY-MM-DD format is required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const attendance = await client.query(`INSERT INTO attendance
      (student_id, attendance_date, status)
      SELECT id, $1, 'missed' FROM students
      ON CONFLICT (student_id, attendance_date) DO NOTHING
      RETURNING id`, [date]);

    const schedules = await client.query(`INSERT INTO schedules
      (schedule_date, title, grade, class_id, location, start_time, end_time, color)
      SELECT $1, title, grade, class_id, location, start_time, end_time, color
      FROM schedules
      WHERE schedule_date = (
        SELECT MAX(schedule_date) FROM schedules WHERE schedule_date < $1
      )
      ON CONFLICT (schedule_date, title, start_time) DO NOTHING
      RETURNING id`, [date]);
    await client.query("COMMIT");

    res.json({
      date,
      attendanceCreated: attendance.rowCount,
      schedulesCreated: schedules.rowCount,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error initializing daily data:", error);
    res.status(500).json({ error: "Failed to initialize daily data" });
  } finally {
    client.release();
  }
};

const getDashboard = async (req, res) => {
  const date = requestedDate(req);
  const classId = requestedClassId(req);
  try {
    const [gender, overview, attendance, schedules, notes] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE gender = 'female')::int AS female,
        COUNT(*) FILTER (WHERE gender = 'male')::int AS male,
        COUNT(*) FILTER (WHERE gender NOT IN ('female', 'male'))::int AS other
        FROM students
        WHERE ($1::int IS NULL OR class_id = $1)`, [classId]),
      pool.query(`SELECT a.status, COUNT(*)::int AS count
        FROM attendance a JOIN students s ON s.id = a.student_id
        WHERE a.attendance_date = $1
          AND ($2::int IS NULL OR s.class_id = $2)
        GROUP BY a.status ORDER BY a.status`, [date, classId]),
      pool.query(`SELECT a.id, a.attendance_date, a.status, a.check_in, a.check_out,
        a.note, s.id AS student_id, s.name, s.grade, s.student_code, s.avatar_url,
        s.class_id, c.name AS class_name
        FROM attendance a JOIN students s ON s.id = a.student_id
        LEFT JOIN classes c ON c.id = s.class_id
        WHERE a.attendance_date = $1
          AND ($2::int IS NULL OR s.class_id = $2)
        ORDER BY s.name LIMIT 5`, [date, classId]),
      pool.query(`SELECT sc.*, c.name AS class_name FROM schedules sc
        LEFT JOIN classes c ON c.id = sc.class_id
        WHERE sc.schedule_date = $1
          AND ($2::int IS NULL OR sc.class_id = $2)
        ORDER BY sc.start_time`, [date, classId]),
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
  const classId = requestedClassId(req);
  const status = req.query.status;
  const search = req.query.search || "";
  try {
    const result = await pool.query(`SELECT a.id, a.attendance_date, a.status,
      a.check_in, a.check_out, a.note, s.id AS student_id, s.name, s.grade,
      s.student_code, s.avatar_url, s.gender, s.address, s.class_id,
      c.name AS class_name
      FROM attendance a JOIN students s ON s.id = a.student_id
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE a.attendance_date = $1
        AND ($2::text IS NULL OR a.status = $2)
        AND ($3::text = '' OR s.name ILIKE '%' || $3 || '%' OR s.student_code ILIKE '%' || $3 || '%')
        AND ($4::int IS NULL OR s.class_id = $4)
      ORDER BY s.name`, [date, status || null, search, classId]);
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
  const classId = requestedClassId(req);
  try {
    const result = await pool.query(
      `SELECT sc.*, c.name AS class_name FROM schedules sc
       LEFT JOIN classes c ON c.id = sc.class_id
       WHERE sc.schedule_date = $1 AND ($2::int IS NULL OR sc.class_id = $2)
       ORDER BY sc.start_time`,
      [requestedDate(req), classId],
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to load schedules" });
  }
};

const getNoteTypes = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, code, default_color FROM note_types ORDER BY name",
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error loading note types:", error);
    res.status(500).json({ error: "Failed to load note types" });
  }
};

const getNotes = async (req, res) => {
  const search = req.query.search || "";
  try {
    const result = await pool.query(`SELECT n.*,
      COALESCE(nt.name, n.category) AS note_type,
      nt.code AS note_type_code
      FROM notes n LEFT JOIN note_types nt ON nt.id = n.note_type_id
      WHERE $1::text = '' OR n.title ILIKE '%' || $1 || '%' OR n.content ILIKE '%' || $1 || '%'
      ORDER BY n.updated_at DESC`, [search]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to load notes" });
  }
};

const createNote = async (req, res) => {
  const { title, content, category, noteTypeId, color, noteDate } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: "Title is required" });
  try {
    const result = await pool.query(`INSERT INTO notes
      (title, content, category, note_type_id, color, note_date)
      VALUES ($1, $2,
        COALESCE((SELECT name FROM note_types WHERE id = $3), $4, 'General'),
        $3, $5, COALESCE($6, CURRENT_DATE)) RETURNING *`,
    [title.trim(), content || "", noteTypeId || null, category || null, color || "#FFF1B8", noteDate || null]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to create note" });
  }
};

const updateNote = async (req, res) => {
  const { title, content, category, noteTypeId, color, noteDate } = req.body;
  try {
    const result = await pool.query(`UPDATE notes SET title = $1, content = $2,
      category = COALESCE((SELECT name FROM note_types WHERE id = $3), $4, 'General'),
      note_type_id = $3, color = $5, note_date = $6, updated_at = NOW()
      WHERE id = $7 RETURNING *`,
    [title, content || "", noteTypeId || null, category || null, color || "#FFF1B8", noteDate, req.params.id]);
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
  getClasses,
  initializeDailyData,
  getDashboard,
  getAttendance,
  upsertAttendance,
  getSchedules,
  getNoteTypes,
  getNotes,
  createNote,
  updateNote,
  deleteNote,
};
