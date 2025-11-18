import express from "express";
import pool from "../config/db.js";
import http from "http";
const app = express();

const server = http.createServer(app);

import { Server } from "socket.io";
import { getTruckById } from "./trucks.js";
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
  waktu_mulai,
  waktu_selesai,
}) {
  try {
    const result = await pool.query(
      `INSERT INTO truk_logger(truk_id, berat, panjang, lebar, tinggi, status, waktu_mulai, waktu_selesai, gate_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9 )
       RETURNING *`,
      [
        id_truk,
        berat_aktual,
        panjang_aktual,
        lebar_aktual,
        tinggi_aktual,
        status,
        waktu_mulai,
        (waktu_selesai = new Date().toISOString()),
        1,
      ]
    );
    const loggerId = insertResult.rows[0].id;
    const trukId = insertResult.rows[0].truk_id;

    await pool.query(
      `
      UPDATE truk_logger tl
      SET lebar = tm.lebar_kir
      FROM truk_master tm
      WHERE tl.id = $1 AND tm.truk_id = $2;
      `,
      [loggerId, trukId]
    );

    console.log("Logger inserted to DB:", result.rows[0]);
    const loggerData = await pool.query(
      `SELECT * FROM truk_full_log WHERE id = $1`,
      [result.rows[0].id]
    );
    console.log("insertLogger result:", loggerData.rows);

    const newLog = loggerData.rows.map((row) => {
      return {
        id: row.id,
        timestamp: row.timestamp,
        gateName: row.gate_name,
        vehicleId: row.truk_id,
        nomorKendaraan: row.nomor_kendaraan,
        uji_kir: {
          length: row.panjang_kir,
          width: row.lebar_kir,
          height: row.tinggi_kir,
          weight: row.max_berat,
        },
        status: `${[row.status]}`,
        photos: ["/truck-front-view.jpg"],
        classDimensions: {
          length: row.max_panjang,
          width: row.max_lebar,
          height: row.max_tinggi,
        },
        sensorReadings: {
          weight: row.berat,
          height: row.tinggi,
          length: row.panjang,
          width: row.lebar_kir,
        },
        waktu_mulai: row.waktu_mulai,
        waktu_selesai: row.waktu_selesai,
      };
    });

    console.log("New log to emit:", newLog);
    return newLog;
  } catch (err) {
    console.error("insertLogger error:", err.message);
    throw new Error("Failed to insert log: " + err.message);
  }
}

async function getAllLogs() {
  try {
    const result = await pool.query(
      `SELECT * FROM truk_full_log ORDER BY timestamp DESC;`
      //     id, timestamp, gateId, tl.truk_id, max_panjang, max_lebar, max_tinggi, max_berat, status, berat, tinggi, panjang, lebar
      // FROM truk_logger tl
      // JOIN truk_master tm on tl.truk_id = tm.truk_id
      // ORDER BY timestamp DESC;`
    );
    console.log("getAllLogs result:", result.rows);
    const row = result.rows[0];
    const transformedLogs = result.rows.map((row) => {
      return {
        id: row.id,
        timestamp: row.timestamp,
        gateName: row.gate_name,
        vehicleId: row.truk_id,
        nomorKendaraan: row.nomor_kendaraan,
        uji_kir: {
          length: row.panjang_kir,
          width: row.lebar_kir,
          height: row.tinggi_kir,
          weight: row.max_berat,
        },
        status: `${[row.status]}`,
        photos: ["/truck-front-view.jpg"],
        classDimensions: {
          length: row.max_panjang,
          width: row.max_lebar,
          height: row.max_tinggi,
        },
        sensorReadings: {
          weight: row.berat,
          height: row.tinggi,
          length: row.panjang,
          width: row.lebar_kir,
        },
        waktu_mulai: row.waktu_mulai,
        waktu_selesai: row.waktu_selesai,
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
    //   const query = `SELECT id, timestamp, gateId, tl.truk_id, max_panjang, max_lebar, max_tinggi, max_berat, status, berat, tinggi, panjang, lebar
    // FROM truk_logger tl
    // JOIN truk_master tm on tl.truk_id = tm.truk_id
    // ORDER BY timestamp DESC
    // LIMIT 1;`;

    const result = await pool.query(
      `SELECT * FROM truk_full_log ORDER BY timestamp DESC LIMIT 1;`
    );
    console.log("getLatestLog result:", result.rows);
    const row = result.rows[0];
    const transformedLogs = result.rows.map((row) => {
      return {
        id: row.id,
        timestamp: row.timestamp,
        gateName: row.gate_name,
        vehicleId: row.truk_id,
        nomorKendaraan: row.nomor_kendaraan,
        uji_kir: {
          length: row.panjang_kir,
          width: row.lebar_kir,
          height: row.tinggi_kir,
          weight: row.max_berat,
        },
        status: `${[row.status]}`,
        photos: ["/truck-front-view.jpg"],
        classDimensions: {
          length: row.max_panjang,
          width: row.max_lebar,
          height: row.max_tinggi,
        },
        sensorReadings: {
          weight: row.berat,
          height: row.tinggi,
          length: row.panjang,
          width: row.lebar_kir,
        },
        waktu_mulai: row.waktu_mulai,
        waktu_selesai: row.waktu_selesai,
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
