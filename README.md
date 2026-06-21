# Student Management API

A Node.js Express backend API with PostgreSQL database for managing student records.

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm

## Installation

1. Clone or navigate to the project directory
2. Install dependencies:

```bash
npm install
```

3. Create `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

4. Update `.env` with your PostgreSQL credentials:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=student_management
DB_USER=postgres
DB_PASSWORD=your_password
SERVER_PORT=5000
CORS_ORIGIN=http://localhost:3000
```

## Database Setup

1. Create the PostgreSQL database:

```sql
CREATE DATABASE student_management;
```

2. Create the students table:

```sql
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Students

- **GET** `/api/students` - Get all students
- **GET** `/api/students/:id` - Get student by ID
- **POST** `/api/students` - Create new student
- **PUT** `/api/students/:id` - Update student
- **DELETE** `/api/students/:id` - Delete student

### Health Check

- **GET** `/api/health` - Check if backend is running

## Frontend Connection

Update your frontend `.env` to point to this backend:

```
REACT_APP_API_URL=http://localhost:5000/api
```

Then use it in your frontend:

```javascript
const response = await fetch(`${process.env.REACT_APP_API_URL}/students`);
```

## Project Structure

```
src/
├── config/
│   └── database.js       # PostgreSQL connection
├── controllers/
│   └── studentController.js  # Business logic
├── routes/
│   └── studentRoutes.js   # API routes
└── server.js             # Main server file
```

## Environment Variables

| Variable    | Description       |
| ----------- | ----------------- |
| DB_HOST     | PostgreSQL host   |
| DB_PORT     | PostgreSQL port   |
| DB_NAME     | Database name     |
| DB_USER     | Database user     |
| DB_PASSWORD | Database password |
| SERVER_PORT | Server port       |
| CORS_ORIGIN | Frontend URL      |

## License

ISC
# Student-management-back
