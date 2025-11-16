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
async function insertLogger(payload) {
  const truk_id = payload.id_truk;
  const berat = payload.berat_aktual;
  const panjang = payload.panjang_aktual;
  const lebar = payload.lebar_aktual;       // ESP01 selalu kirim lebar_aktual
  const tinggi = payload.tinggi_aktual;
  const status = payload.status;
  try {
    const result = await pool.query(
      `
      INSERT INTO truk_logger (
        truk_id, berat, panjang, lebar, tinggi, status, waktu_mulai, waktu_selesai
      )
      SELECT
        $1::text AS truk_id,
        $2::integer AS berat,
        $3::integer AS panjang,
        tm.max_lebar::integer AS lebar,   -- <=== ambil dari truk_master
        $4::integer AS tinggi,
        $5::text AS status,
        NOW() AS waktu_mulai,
        NOW() AS waktu_selesai
      FROM truk_master tm
      WHERE tm.truk_id = $1
      RETURNING *;
      `,
      [truk_id, berat, panjang, tinggi, status]
    );

    console.log("insertLogger result:", result.rows);

    // const row = result.rows[0];
    const newLog = result.rows.map((row) => {
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
          width: row.lebar,
        },
        waktu_mulai: row.waktu_mulai,
        waktu_selesai: row.waktu_selesai,
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
          width: row.lebar,
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
    const result = await pool.query(
      `SELECT id, timestamp, gateId, tl.truk_id, max_panjang, max_lebar, max_tinggi, max_berat, status, berat, tinggi, panjang, lebar
	FROM truk_logger tl
	JOIN truk_master tm on tl.truk_id = tm.truk_id
	ORDER BY timestamp DESC
  LIMIT 1;`
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
          width: row.lebar,
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
