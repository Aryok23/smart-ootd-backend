import express from "express";
import pool from "../config/db.js";
import http from "http";
const app = express();
import { publishToMqtt } from "../mqtt/mqttPublisher.js";
import {
  fetchTruckFromOnline,
  ensureVehicleClassExists,
  insertTruckToLocalDB,
} from "../helper/fetchFromOnline.js";
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
    // try to hit local DB first
    const result = await pool.query(
      "SELECT * FROM truk_master tm WHERE truk_id = $1",
      [id_truk]
    );
    if (result.rows.length > 0) {
      console.log("Cache HIT (local truck)");
      return result.rows[0];
    }
    // if MISS, fetch from online backend
    console.log("Cache MISS → Fetching online backend...");
    const onlineTruck = await fetchTruckFromOnline(id_truk);

    if (!onlineTruck) {
      console.log("Truck not found online");
      return null;
    }

    // --- Before inserting truck → ensure class exists
    if (onlineTruck.vehicle_class) {
      await ensureVehicleClassExists(onlineTruck.vehicle_class);
    }

    // --- Insert truck into local DB
    await insertTruckToLocalDB(onlineTruck);

    return onlineTruck;
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
       RETURNING *  `,
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
      "SELECT * FROM truk_master tm WHERE nomor_kendaraan = $1",
      [nomorKendaraan]
    );
    // HIT local DB
    if (result.rows.length > 0) {
      console.log("Cache HIT (local truck)");

      const row = result.rows[0];
      const payload = buildPayload(row);

      publishToMqtt("smart-ootd/truk/response", payload);
      console.log("Truck Data (HIT): ", payload);

      return payload;
    }

    // if MISS, fetch from online backend
    console.log("Cache MISS → Fetching from online backend...");
    const onlineTruck = await fetchTruckFromOnline(nomorKendaraan);

    if (!onlineTruck) {
      console.log(
        `Truck with Nomor Kendaraan ${nomorKendaraan} NOT FOUND (local & online)`
      );

      publishToMqtt("smart-ootd/truk/response", `NOT_FOUND,${nomorKendaraan}`);

      return null;
    }

    // --- Before inserting truck → ensure class exists
    if (onlineTruck.vehicle_class) {
      await ensureVehicleClassExists(onlineTruck.vehicle_class);
    }

    // --- Insert truck into local DB
    const insertedTruck = await insertTruckToLocalDB(onlineTruck);

    const payload = buildPayload(insertedTruck);

    publishToMqtt("smart-ootd/truk/response", payload);

    console.log("Truck Data (MISS → INSERTED): ", payload);
    return payload;
  } catch (err) {
    console.error(
      `manualMeasure error (nomorKendaraan: ${nomorKendaraan}):`,
      err.message
    );
    throw new Error("Failed to fetch truck by nomor kendaraan");
  }
}

function buildPayload(row) {
  return {
    id_truk: row.truk_id,
    kelas: row.class_id,
    batas_berat: row.max_berat,
    batas_panjang: row.panjang_kir,
    batas_lebar: row.lebar_kir,
    batas_tinggi: row.tinggi_kir,
    waktu_mulai: new Date().toISOString(),
  };
}

export {
  getAllTrucks,
  getTruckById,
  insertTruck,
  deleteTruckById,
  manualMeasure,
};
