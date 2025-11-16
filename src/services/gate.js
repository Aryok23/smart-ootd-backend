import express from "express";
import pool from "../config/db.js";
import http from "http";
const app = express();
import { publishToMqtt } from "../mqtt/mqttPublisher.js";

const server = http.createServer(app);
// function for get gate name
async function getAllGateName() {
  try {
    const result = await pool.query(`SELECT * FROM gates`);
    return result.rows;
  } catch (err) {
    console.error("getAllGateName error:", err.message);
    throw new Error("Failed to get all gate names");
  }
}

// function for open/close gate manually
async function setGateStatus(gateId, status) {
  try {
    // Update status in database
    const result = await pool.query(
      `UPDATE gates 
       SET gate_status = $1 
       WHERE gate_name = $2 
       RETURNING *`,
      [status, gateId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Gate ${gateId} not found`);
    }

    // Publish ke MQTT setelah database berhasil diupdate
    await publishToMqtt("smart-ootd/servo/cmd",
      `SERVO:${gateId}:${status}`
    );

    console.log(`[GATE] ${gateId} set to ${status}`);

    return result.rows[0];
  } catch (err) {
    console.error("setGateStatus error:", err.message);
    throw new Error("Failed to set gate status");
  }
}

// function for get gate status
async function getGateStatus(gateId) {
  try {
    const result = await pool.query(
      `SELECT * FROM gates WHERE gate_name = $1`,
      [gateId]
    );
    return result.rows[0];
  } catch (err) {
    console.error("getGateStatus error:", err.message);
    throw new Error("Failed to get gate status");
  }
}

export { setGateStatus, getGateStatus, getAllGateName };

// Cara Gunakan Fungsi -> Cek get status via getGateStatus -> Buat Rules untuk membuka/menutup gate via setGateStatus
