const jwt = require("jsonwebtoken");

const jwtSecret = process.env.JWT_SECRET || "development-only-change-me";

const authenticate = (req, res, next) => {
  const authorization = req.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = {
      id: Number(payload.sub),
      username: payload.username,
      role: payload.role,
    };
    next();
  } catch (_) {
    res.status(401).json({ error: "Invalid or expired session" });
  }
};

module.exports = authenticate;
