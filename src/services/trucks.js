const pool = require('../config/db');

/**
 * Ambil semua data truk master
 */
async function getAllTrucks() {
  try {
    const result = await pool.query('SELECT * FROM truk_master ORDER BY id_truk ASC');
    return result.rows;
  } catch (err) {
    console.error('getAllTrucks error:', err.message);
    throw new Error('Failed to fetch trucks');
  }
}

/**
 * Ambil data truk master berdasarkan ID
 */
async function getTruckById(id_truk) {
  try {
    const result = await pool.query(
      'SELECT * FROM truk_master WHERE id_truk = $1',
      [id_truk]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error(`getTruckById error (id: ${id_truk}):`, err.message);
    throw new Error('Failed to fetch truck by ID');
  }
}

/**
 * Tambah truk baru ke master
 */
async function insertTruck({ id_truk, kategori, batas_berat, batas_panjang, batas_lebar, batas_tinggi }) {
  try {
    const result = await pool.query(
      `INSERT INTO truk_master (id_truk, kategori, batas_berat, batas_panjang, batas_lebar, batas_tinggi)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id_truk, kategori, batas_berat, batas_panjang, batas_lebar, batas_tinggi]
    );
    return result.rows[0];
  } catch (err) {
    console.error('insertTruck error:', err.message);
    throw new Error('Failed to insert truck');
  }
}

/**
 * Tambah log hasil pemeriksaan truk
 */
async function insertLogger({ id_truk, berat_aktual, panjang_aktual, lebar_aktual, tinggi_aktual, status }) {
  try {
    const result = await pool.query(
      `INSERT INTO truk_logger (id_truk, berat_aktual, panjang_aktual, lebar_aktual, tinggi_aktual, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id_truk, berat_aktual, panjang_aktual, lebar_aktual, tinggi_aktual, status]
    );
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

module.exports = {
  getAllTrucks,
  getTruckById,
  insertTruck,
  insertLogger,
  getAllLogs,
};
