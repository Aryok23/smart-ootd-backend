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
    // send via mqtt to open gate
    // await mqttClient.publish('topic/gate/set', JSON.stringify({ gateId, status }));

    // update status in database if successfully sent via mqtt
    const result = await pool.query(
      `INSERT INTO public.gate_status (gate_name, gate_status)
          VALUES ($1, $2)
          ON CONFLICT (gate_name)
          DO UPDATE
          SET gate_status = EXCLUDED.gate_status;
          RETURNING *`,
      [status, gateId]
    );
    publishToMqtt("smart-ootd/servo/cmd", { msg: `SERVO:${gateId}:${status}` });
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

export { setGateStatus, getGateStatus, getAllGateName };

// Cara Gunakan Fungsi -> Cek get status via getGateStatus -> Buat Rules untuk membuka/menutup gate via setGateStatus
