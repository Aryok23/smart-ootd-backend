import express from "express";
import pool from "../config/db.js";
import http from "http";
import bcrypt from "bcrypt";
const app = express();

const server = http.createServer(app);

async function loginUser(username, password) {
  try {
    // Query username
    const result = await pool.query(
      "SELECT id, username, email, password_hash, created_at, updated_at FROM admins WHERE username = $1",
      [username]
    );

    console.log("Query result:", result.rows);

    // Cek user
    if (result.rows.length === 0) {
      return { success: false, message: "Invalid credentials" };
    }

    const user = result.rows[0];

    // Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return { success: false, message: "Invalid credentials" };
    }
    const { password_hash, ...userWithoutPassword } = user;

    return {
      success: true,
      user: userWithoutPassword,
    };
  } catch (err) {
    console.error("loginUser error:", err.message);
    throw new Error("Failed to login user");
  }
}

async function registerUser(username, password, email) {
  try {
    const result = await pool.query(
      `INSERT INTO admins (username, password, email)
             VALUES ($1, $2, $3)
             RETURNING *`,
      [username, password, email]
    );
    return { success: true, user: result.rows[0] };
  } catch (err) {
    console.error("registerUser error:", err.message);
    throw new Error("Failed to register user");
  }
}

async function logoutUser(userId) {
  try {
    // token
    return { success: true, message: "User logged out successfully" };
  } catch (err) {
    console.error("logoutUser error:", err.message);
    throw new Error("Failed to logout user");
  }
}
export { loginUser, registerUser, logoutUser };
