import express from "express";
import pool from "../config/db.js";
import http from "http";
const app = express();

const server = http.createServer(app);

import { Server } from "socket.io";
const io = new Server(server, {
  cors: {
    origin: "*", // nanti ubah ke domain frontend kamu
  },
});

/*Tambah log baru ke database dan kirim ke client melalui websocket*/
async function insertLogger({
  id_truk,
  berat_aktual,
  panjang_aktual,
  lebar_aktual,
  tinggi_aktual,
  status,
}) {
  try {
    const result = await pool.query(
      `INSERT INTO truk_logger(truk_id, berat, panjang, lebar, tinggi, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        id_truk,
        berat_aktual,
        panjang_aktual,
        lebar_aktual,
        tinggi_aktual,
        status,
      ]
    );

    console.log("insertLogger result:", result.rows);

    // const row = result.rows[0];
    const newLog = result.rows.map((row) => {
      return {
        id: row.id,
        timestamp: row.waktu,
        gateId: row.gateId,
        vehicleId: row.truk_id,
        dimensions: {
          length: row.panjang,
          width: row.lebar,
          height: row.tinggi,
        },
        weight: row.berat,
        status: `${[row.status]}`,
        photos: ["/truck-front-view.jpg"],
        sensorReadings: {
          weightSensor: row.berat,
          heightSensor: row.tinggi,
          lengthSensor: row.panjang,
          widthSensor: row.lebar,
        },
      };
    });

    console.log("New log to emit:", newLog);

    if (io) {
      io.emit("new_log", newLog);
    }

    return newLog;
  } catch (err) {
    console.error("insertLogger error:", err.message);
    throw new Error("Failed to insert log: " + err.message);
  }
}

async function getAllLogs() {
  try {
    const result = await pool.query(
      `SELECT id, waktu, gateId, tl.truk_id, max_panjang, max_lebar, max_tinggi, max_berat, status, berat, tinggi, panjang, lebar
	FROM truk_logger tl
	JOIN truk_master tm on tl.truk_id = tm.truk_id
	ORDER BY waktu DESC;`
    );
    console.log("getAllLogs result:", result.rows);
    const row = result.rows[0];
    const transformedLogs = result.rows.map((row) => {
      return {
        id: row.id,
        timestamp: row.waktu,
        gateId: row.gateId,
        vehicleId: row.truk_id,
        dimensions: {
          length: row.panjang,
          width: row.lebar,
          height: row.tinggi,
        },
        weight: row.berat,
        status: [row.status],
        photos: ["/truck-front-view.jpg"],
        sensorReadings: {
          weightSensor: row.berat,
          heightSensor: row.tinggi,
          lengthSensor: row.panjang,
          widthSensor: row.lebar,
        },
      };
    });
    return transformedLogs;
  } catch (err) {
    console.error("getAllLogs error:", err.message);
    throw new Error("Failed to fetch logs");
  }
}

async function getLatestLog() {
  try {
    const result = await pool.query(
      `SELECT id, waktu, gateId, tl.truk_id, max_panjang, max_lebar, max_tinggi, max_berat, status, berat, tinggi, panjang, lebar
	FROM truk_logger tl
	JOIN truk_master tm on tl.truk_id = tm.truk_id
	ORDER BY waktu DESC
  LIMIT 1;`
    );
    console.log("getLatestLog result:", result.rows);
    const row = result.rows[0];
    const transformedLogs = result.rows.map((row) => {
      return {
        id: row.id,
        timestamp: row.waktu,
        gateId: row.gateId,
        vehicleId: row.truk_id,
        dimensions: {
          length: row.panjang,
          width: row.lebar,
          height: row.tinggi,
        },
        weight: row.berat,
        status: [row.status],
        photos: ["/truck-front-view.jpg"],
        sensorReadings: {
          weightSensor: row.berat,
          heightSensor: row.tinggi,
          lengthSensor: row.panjang,
          widthSensor: row.lebar,
        },
      };
    });
    return transformedLogs;
  } catch (err) {
    console.error("getLatestLog error:", err.message);
    throw new Error("Failed to fetch latest log");
  }
}

async function deleteLogById(id) {
  try {
    const result = await pool.query(
      "DELETE FROM truk_logger WHERE id = $1 RETURNING *",
      [id]
    );

    return result.rows[0];
  } catch (err) {
    console.error("deleteLog error:", err.message);
    throw new Error("Failed to delete log");
  }
}

export { insertLogger, getAllLogs, getLatestLog, deleteLogById };
