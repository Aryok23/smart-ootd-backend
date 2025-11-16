import express from "express";
import pool from "../config/db.js";
import http from "http";
const app = express();
import { publishToMqtt } from "../mqtt/mqttPublisher.js";

const server = http.createServer(app);

import { Server } from "socket.io";
const io = new Server(server, {
  cors: {
    origin: "*", // nanti ubah ke domain frontend kamu
  },
});

/*Ambil semua data truk master*/
async function getAllTrucks() {
  try {
    const result = await pool.query(
      "SELECT * FROM truk_master ORDER BY truk_id ASC"
    );
    return result.rows;
  } catch (err) {
    console.error("getAllTrucks error:", err.message);
    throw new Error("Failed to fetch trucks");
  }
}

/*Ambil data truk master berdasarkan ID*/
async function getTruckById(id_truk) {
  try {
    const result = await pool.query(
      "SELECT * FROM truk_master tm JOIN vehicle_class vc ON tm.class_id = vc.class_id WHERE truk_id = $1",
      [id_truk]
    );
    return {};
  } catch (err) {
    console.error(`getTruckById error (id: ${id_truk}):`, err.message);
    throw new Error("Failed to fetch truck by ID");
  }
}

/*Tambah truk baru ke master*/
async function insertTruck({
  id_truk,
  kategori,
  batas_berat,
  batas_panjang,
  batas_lebar,
  batas_tinggi,
}) {
  try {
    const result = await pool.query(
      `INSERT INTO truk_master (id_truk, kategori, batas_berat, batas_panjang, batas_lebar, batas_tinggi)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id_truk, kategori, batas_berat, batas_panjang, batas_lebar, batas_tinggi]
    );
    return result.rows[0];
  } catch (err) {
    console.error("insertTruck error:", err.message);
    throw new Error("Failed to insert truck");
  }
}

// fungsi untuk mengupdate data truk master
async function updateTruck(id_truk, updateData) {
  try {
    const fields = [];
    const values = [];
    let index = 1;
    for (const key in updateData) {
      fields.push(`${key} = $${index}`);
      values.push(updateData[key]);
      index++;
    }
    values.push(id_truk);

    const result = await pool.query(
      `UPDATE truk_master SET ${fields.join(
        ", "
      )} WHERE truk_id = $${index} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error(`Truck ID '${id_truk}' not found in truk_master`);
    }

    return result.rows[0];
  } catch (err) {
    console.error("updateTruck error:", err.message);
    throw new Error("Failed to update truck");
  }
}

// fungsi untuk menghapus data truk master berdasarkan ID/nomor kendaraan
async function deleteTruckById(id_truk) {
  try {
    await pool.query(
      "DELETE FROM truk_master WHERE truk_id = $1 OR nomor_kendaraan = $1",
      [id_truk]
    );
  } catch (err) {
    console.error("deleteTruckById error:", err.message);
    throw new Error("Failed to delete truck");
  }
}

/*Manual trigger pengukuran ulang truk berdasarkan nomor kendaraan*/
async function manualMeasure(nomorKendaraan) {
  try {
    const result = await pool.query(
      // "SELECT * FROM truk_master tm JOIN vehicle_class vc ON tm.class_id = vc.class_id WHERE nomor_kendaraan = $1",
      "SELECT * FROM truk_master WHERE nomor_kendaraan = $1",
      [nomorKendaraan]
    );

    // PUBLISH TO MQTT TOPIC or EMIT SOCKET EVENT
    console.log("Truck Data for Manual Measure: ", result.rows[0]);
    publishToMqtt(`smart-ootd/truk/response`, result.rows[0]);
    return result.rows[0];
  } catch (err) {
    console.error(
      `manualMeasure error (nomorKendaraan: ${nomorKendaraan}):`,
      err.message
    );
    throw new Error("Failed to fetch truck by nomor kendaraan");
  }
}

/**
 * Tambah log hasil pemeriksaan truk
 */
async function insertLogger({ id_truk, berat_aktual, panjang_aktual, tinggi_aktual, status }) {
  try {
    const result = await pool.query(
      `
      INSERT INTO truk_logger (
        id_truk, berat_aktual, panjang_aktual, lebar_aktual, tinggi_aktual, status
      )
      SELECT 
        $1::text AS id_truk,
        $2::double precision AS berat_aktual,
        $3::double precision AS panjang_aktual,
        tm.batas_lebar::double precision AS lebar_aktual,
        $4::double precision AS tinggi_aktual,
        $5::text AS status
      FROM truk_master tm
      WHERE tm.id_truk = $1::text
      RETURNING *;
      `,
      [id_truk, berat_aktual, panjang_aktual, tinggi_aktual, status]
    );

    if (result.rows.length === 0) {
      throw new Error(`Truck ID '${id_truk}' not found in truk_master`);
    }

    return result.rows[0];
  } catch (err) {
    console.error('insertLogger error:', err.message);
    throw new Error('Failed to insert log');
  }
}

/**
 * Ambil semua log truk
 */
async function getAllLogs() {
  try {
    const result = await pool.query('SELECT * FROM truk_logger ORDER BY timestamp DESC');
    return result.rows;
  } catch (err) {
    console.error('getAllLogs error:', err.message);
    throw new Error('Failed to fetch logs');
  }
}

export {
  getAllTrucks,
  getTruckById,
  insertTruck,
  deleteTruckById,
  manualMeasure,
  insertLogger,
  getAllLogs,
};
