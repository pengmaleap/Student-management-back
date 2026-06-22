const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

const jwtSecret = process.env.JWT_SECRET || "development-only-change-me";

const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  fullName: user.full_name,
  role: user.role,
});

const createToken = (user) =>
  jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    jwtSecret,
    { expiresIn: "7d" },
  );

const ensureDefaultAdmin = async () => {
  if (process.env.NODE_ENV === "production") return false;

  const result = await pool.query("SELECT COUNT(*)::int AS count FROM users");
  if (result.rows[0].count > 0) return false;

  const passwordHash = await bcrypt.hash("123", 12);
  await pool.query(
    `INSERT INTO users (username, full_name, password_hash, role)
     VALUES ('Admin', 'System Administrator', $1, 'admin')
     ON CONFLICT (LOWER(username)) DO NOTHING`,
    [passwordHash],
  );
  return true;
};

const register = async (req, res) => {
  const username = req.body.username?.trim();
  const password = req.body.password;
  const email = req.body.email?.trim() || null;
  const fullName = req.body.fullName?.trim() || null;

  if (!username || username.length < 3) {
    return res.status(400).json({ error: "Username must be at least 3 characters" });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (username, email, full_name, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, full_name, role`,
      [username, email, fullName, passwordHash],
    );
    const user = result.rows[0];
    res.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "Username or email already exists" });
    }
    console.error("Registration failed:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
};

const login = async (req, res) => {
  const username = req.body.username?.trim();
  const password = req.body.password;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const result = await pool.query(
      `SELECT id, username, email, full_name, password_hash, role, is_active
       FROM users WHERE LOWER(username) = LOWER($1)`,
      [username],
    );
    const user = result.rows[0];
    const valid = user && user.is_active && await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    res.json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    console.error("Login failed:", error);
    res.status(500).json({ error: "Failed to log in" });
  }
};

const me = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, full_name, role FROM users
       WHERE id = $1 AND is_active = TRUE`,
      [req.user.id],
    );
    if (!result.rows[0]) return res.status(404).json({ error: "User not found" });
    res.json({ user: publicUser(result.rows[0]) });
  } catch (error) {
    res.status(500).json({ error: "Failed to load user" });
  }
};

module.exports = { ensureDefaultAdmin, register, login, me };
