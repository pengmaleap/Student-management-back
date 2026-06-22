const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const pool = require("./config/database");
const authenticate = require("./middleware/auth");
const { ensureDefaultAdmin } = require("./controllers/authController");
require("dotenv").config();

const app = express();
const PORT = process.env.SERVER_PORT || 5000;

// Middleware
const configuredOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use(
  cors({
    origin(origin, callback) {
      const isLocalDevelopment =
        process.env.NODE_ENV !== "production" &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || "");
      if (!origin || origin === configuredOrigin || isLocalDevelopment) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/students", authenticate, require("./routes/studentRoutes"));
app.use("/api", authenticate, require("./routes/managementRoutes"));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ message: "Backend is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Verify PostgreSQL before accepting API requests.
const startServer = async () => {
  try {
    const result = await pool.query("SELECT current_database() AS database");
    console.log(`Connected to PostgreSQL database: ${result.rows[0].database}`);
    if (await ensureDefaultAdmin()) {
      console.log("Created development default user: Admin");
    }

    const server = app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(
          `Port ${PORT} is already in use. Set SERVER_PORT to another port in .env.`,
        );
      } else {
        console.error("Server failed to start:", error.message);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error("Failed to connect to PostgreSQL:", error.message);
    process.exit(1);
  }
};

startServer();
