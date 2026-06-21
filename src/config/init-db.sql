-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster searches
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

-- Sample data (optional)
INSERT INTO students (name, email, phone, address) VALUES
('John Doe', 'john@example.com', '555-1234', '123 Main St'),
('Jane Smith', 'jane@example.com', '555-5678', '456 Oak Ave')
ON CONFLICT (email) DO NOTHING;
