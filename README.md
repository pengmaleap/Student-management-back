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
DB_NAME=student_ms_db
DB_USER=postgres
DB_PASSWORD=your_password
SERVER_PORT=5001
JWT_SECRET=replace_with_a_long_random_secret
CORS_ORIGIN=http://localhost:3000
```

## Database Setup

1. Create the PostgreSQL database:

```sql
CREATE DATABASE student_ms_db;
```

2. Apply the schema and development seed data:

```bash
psql -d student_ms_db -f src/config/init-db.sql
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

The server will start on `http://localhost:5001`

When the users table is empty in development, the backend creates a default
administrator account with username `Admin` and password `123`. Change this
password before using the project outside local development.

## API Endpoints

### Authentication

- **POST** `/api/auth/register` - Create a teacher account
- **POST** `/api/auth/login` - Log in and receive a JWT
- **GET** `/api/auth/me` - Validate an authenticated session

All student-management endpoints require `Authorization: Bearer <token>`.

### Students

- **GET** `/api/students` - Get all students
- **GET** `/api/students/:id` - Get student by ID
- **POST** `/api/students` - Create new student
- **PUT** `/api/students/:id` - Update student
- **DELETE** `/api/students/:id` - Delete student

### Dashboard and attendance

- **GET** `/api/classes` - List classes and student counts
- **GET** `/api/dashboard?date=YYYY-MM-DD` - Dashboard totals and dated data
- **GET** `/api/attendance?date=YYYY-MM-DD` - Attendance list
- **PUT** `/api/attendance` - Create or update a student's attendance
- **GET** `/api/schedules?date=YYYY-MM-DD` - Dated class schedule

### Notes

- **GET** `/api/note-types` - List available note types
- **GET** `/api/notes` - List and search notes
- **POST** `/api/notes` - Create a note
- **PUT** `/api/notes/:id` - Update a note
- **DELETE** `/api/notes/:id` - Delete a note

### Health Check

- **GET** `/api/health` - Check if backend is running

## Frontend Connection

Override the API URL when needed:

```bash
flutter run --dart-define=API_BASE_URL=http://localhost:5001/api
```

`ApiService` uses `http://localhost:5001/api` by default. Android emulators use
`http://10.0.2.2:5001/api` automatically. For a physical device, pass the
development computer's LAN address with `--dart-define=API_BASE_URL=...`.

## Project Structure

```
src/
├── config/
│   ├── database.js       # PostgreSQL connection
│   └── init-db.sql       # Schema and development seed
├── controllers/
│   ├── managementController.js
│   └── studentController.js
├── routes/
│   ├── managementRoutes.js
│   └── studentRoutes.js
└── server.js
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
