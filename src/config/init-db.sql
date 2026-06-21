CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  address TEXT,
  gender VARCHAR(10) NOT NULL DEFAULT 'other',
  grade VARCHAR(50) NOT NULL DEFAULT 'Unassigned',
  student_code VARCHAR(30) UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE students ADD COLUMN IF NOT EXISTS gender VARCHAR(10) NOT NULL DEFAULT 'other';
ALTER TABLE students ADD COLUMN IF NOT EXISTS grade VARCHAR(50) NOT NULL DEFAULT 'Unassigned';
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_code VARCHAR(30) UNIQUE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_gender ON students(gender);

CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL,
  check_in TIME,
  check_out TIME,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (student_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);

CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  schedule_date DATE NOT NULL,
  title VARCHAR(255) NOT NULL,
  grade VARCHAR(50),
  location VARCHAR(255),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  color VARCHAR(10) DEFAULT '#3A86FF',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (schedule_date, title, start_time)
);

CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(schedule_date);

CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category VARCHAR(50) NOT NULL DEFAULT 'General',
  color VARCHAR(10) NOT NULL DEFAULT '#FFF1B8',
  note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notes_date ON notes(note_date DESC);

INSERT INTO students (name, email, phone, address, gender, grade, student_code, avatar_url) VALUES
('John Doe', 'john@example.com', '555-1234', '123 Main St', 'male', 'Grade 9A', 'STU0001', 'https://i.pravatar.cc/160?img=12'),
('Jane Smith', 'jane@example.com', '555-5678', '456 Oak Ave', 'female', 'Grade 9A', 'STU0002', 'https://i.pravatar.cc/160?img=47'),
('Rin Sokim', 'rin@example.com', '012-111-222', 'Phnom Penh', 'female', 'Grade 9B', 'STU0003', 'https://i.pravatar.cc/160?img=44'),
('Phen Sokleng', 'phen@example.com', '012-333-444', 'Phnom Penh', 'male', 'Grade 9A', 'STU0004', 'https://i.pravatar.cc/160?img=11'),
('Dara Vannak', 'dara@example.com', '012-555-666', 'Kandal', 'male', 'Grade 10A', 'STU0005', 'https://i.pravatar.cc/160?img=5'),
('Srey Neang', 'neang@example.com', '012-777-888', 'Kampong Cham', 'female', 'Grade 10A', 'STU0006', 'https://i.pravatar.cc/160?img=32')
ON CONFLICT (email) DO UPDATE SET
  gender = EXCLUDED.gender,
  grade = EXCLUDED.grade,
  student_code = EXCLUDED.student_code,
  avatar_url = EXCLUDED.avatar_url;

INSERT INTO attendance (student_id, attendance_date, status, check_in, check_out, note)
SELECT id, CURRENT_DATE,
  CASE student_code
    WHEN 'STU0001' THEN 'present'
    WHEN 'STU0002' THEN 'on_time'
    WHEN 'STU0003' THEN 'late'
    WHEN 'STU0004' THEN 'early_leave'
    WHEN 'STU0005' THEN 'absent'
    ELSE 'on_leave'
  END,
  CASE WHEN student_code IN ('STU0005', 'STU0006') THEN NULL ELSE TIME '07:45' END,
  CASE WHEN student_code = 'STU0004' THEN TIME '13:30' ELSE NULL END,
  NULL
FROM students
ON CONFLICT (student_id, attendance_date) DO NOTHING;

INSERT INTO attendance (student_id, attendance_date, status, check_in)
SELECT id, CURRENT_DATE - 1,
  CASE WHEN id % 4 = 0 THEN 'absent' WHEN id % 3 = 0 THEN 'late' ELSE 'present' END,
  CASE WHEN id % 4 = 0 THEN NULL ELSE TIME '07:40' END
FROM students
ON CONFLICT (student_id, attendance_date) DO NOTHING;

INSERT INTO schedules (schedule_date, title, grade, location, start_time, end_time, color) VALUES
(CURRENT_DATE, 'Mathematics', 'Grade 9A', 'Room 201', '08:00', '09:00', '#3A86FF'),
(CURRENT_DATE, 'English Literature', 'Grade 9B', 'Room 105', '09:30', '10:30', '#20C997'),
(CURRENT_DATE, 'Science Lab', 'Grade 10A', 'Laboratory', '11:00', '12:00', '#FFB020')
ON CONFLICT (schedule_date, title, start_time) DO NOTHING;

INSERT INTO notes (title, content, category, color, note_date)
SELECT * FROM (VALUES
  ('Parent Meeting', 'Discuss quarterly progress with parents of Grade 9A. Focus on Math and Science scores.', 'Important', '#FFF1B8', CURRENT_DATE),
  ('Grading', 'Finish grading the mid-term exams and upload results to the portal.', 'To-do', '#C9F7DF', CURRENT_DATE + 1),
  ('Lesson Plan', 'Update lesson plan for next week. Include interactive quizzes and group activities.', 'Lecture notes', '#D9E8FF', CURRENT_DATE + 2)
) AS seed(title, content, category, color, note_date)
WHERE NOT EXISTS (SELECT 1 FROM notes);
