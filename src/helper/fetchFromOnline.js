import pool from "../config/db.js";

export async function fetchTruckFromOnline(id_truk) {
  try {
    const response = await fetch(
      `https://smart-ootd-kemenhub-backend.vercel.app/kemenhub/truck/${id_truk}`
    );

    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    console.error("Error fetching from online backend:", error);
    return null;
  }
}
export async function ensureVehicleClassExists(classData) {
  try {
    const check = await pool.query(
      "SELECT * FROM vehicle_class WHERE class_id = $1",
      [classData.class_id]
    );

    if (check.rows.length > 0) {
      console.log("Vehicle class HIT (local DB)");
      return; // sudah ada
    }

    console.log("Vehicle class MISS → inserting into local DB...");

    await pool.query(
      `
        INSERT INTO vehicle_class (
          class_id, class_name, max_panjang, max_lebar, max_tinggi, max_berat
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        classData.class_id,
        classData.class_name,
        classData.max_panjang,
        classData.max_lebar,
        classData.max_tinggi,
        classData.max_berat,
      ]
    );
  } catch (err) {
    console.error("Error ensureVehicleClassExists:", err.message);
  }
}
export async function insertTruckToLocalDB(truck) {
  try {
    await pool.query(
      `
      INSERT INTO truk_master (
        truk_id, nomor_kendaraan, panjang_kir, lebar_kir, tinggi_kir, max_berat, class_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        truck.truk_id,
        truck.nomor_kendaraan,
        truck.panjang_kir,
        truck.lebar_kir,
        truck.tinggi_kir,
        truck.max_berat,
        truck.class_id,
      ]
    );

    console.log("Truck inserted into local DB:", truck.truk_id);
  } catch (err) {
    console.error("Insert truck to local DB error:", err.message);
  }
}
