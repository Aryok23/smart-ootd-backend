import express from "express";
import pool from "../config/db.js";
import http from "http";
const app = express();

const server = http.createServer(app);

// function for open/close gate manually
async function setGateStatus(gateId, status) {
  try {
    // send via mqtt to open gate
    // await mqttClient.publish('topic/gate/set', JSON.stringify({ gateId, status }));

    // update status in database if successfully sent via mqtt
    const result = await pool.query(
      `UPDATE gates SET status = $1 WHERE id = $2 RETURNING *`,
      [status, gateId]
    );
    return result.rows[0];
  } catch (err) {
    console.error("setGateStatus error:", err.message);
    throw new Error("Failed to set gate status");
  }
}

// function for get gate status
async function getGateStatus(gateId) {
  try {
    const result = await pool.query(`SELECT * FROM gates WHERE id = $1`, [
      gateId,
    ]);
    return result.rows[0];
  } catch (err) {
    console.error("getGateStatus error:", err.message);
    throw new Error("Failed to get gate status");
  }
}

export { setGateStatus, getGateStatus };

// Cara Gunakan Fungsi -> Cek get status via getGateStatus -> Buat Rules untuk membuka/menutup gate via setGateStatus
