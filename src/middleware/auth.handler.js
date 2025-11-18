import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// JWT Secret dari environment variable
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

// Fungsi untuk generate JWT token
function generateJWTToken(
  userId,
  username,
  email,
  role = "admin",
  rememberMe = false
) {
  const payload = {
    id: userId,
    username: username,
    email: email,
    role: role,
    iat: Math.floor(Date.now() / 1000),
  };

  // Jika remember me: 30 hari, jika tidak: 24 jam
  const expiresIn = rememberMe ? "30d" : JWT_EXPIRES_IN;

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: expiresIn,
  });
}

// Fungsi untuk verify JWT token (untuk middleware authentication)
function verifyJWTToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
function authenticateToken(req, res, next) {
  // Ambil token dari header Authorization
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  const result = verifyJWTToken(token);

  if (!result.valid) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }

  // Simpan user info ke req object
  req.user = result.decoded;
  next();
}

export { generateJWTToken, verifyJWTToken, authenticateToken };
