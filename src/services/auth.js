import express from "express";
import pool from "../config/db.js";
import http from "http";
const app = express();

const server = http.createServer(app);

async function loginUser(username, password) {
  try {
    const result = await pool.query(
      "SELECT * FROM admins WHERE username = $1 AND password = $2",
      [username, password]
    );
    console.log("query_result: ", result);
    if (result.rows.length > 0) {
      return { success: true, user: result.rows[0] };
    } else {
      return { success: false, message: "Invalid credentials" };
    }
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
