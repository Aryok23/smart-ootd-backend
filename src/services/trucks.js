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

/*Ambil semua data truk master*/
async function getAllTrucks() {
  try {
    const result = await pool.query(
      "SELECT * FROM truk_master ORDER BY id_truk ASC"
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
      "SELECT * FROM truk_master WHERE id_truk = $1",
      [id_truk]
    );
    return result.rows[0] || null;
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

export {
  getAllTrucks,
  getTruckById,
  insertTruck,
  
};
