import { Pool } from "pg";
// const path = require('path');
// require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
import "dotenv/config";

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  max: 10, // batas koneksi aktif (default 10)
  idleTimeoutMillis: 30000, // auto release setelah idle
  ssl: {
    rejectUnauthorized: false, // penting agar koneksi SSL diterima tanpa sertifikat manual
  },
});

// Tes koneksi awal
(async () => {
  try {
    const client = await pool.connect();
    console.log("Connected to PostgreSQL");
    client.release();
  } catch (err) {
    console.error("Database connection error:", err.message);
  }
})();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Closing database pool...");
  await pool.end();
  process.exit(0);
});

export default pool;
