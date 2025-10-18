const { getAllTrucks, getTruckById, insertLogger, getAllLogs } = require('../src/services/trucks');

(async () => {
  try {
    // Ambil semua truk
    const trucks = await getAllTrucks();
    console.log("Truk master:", trucks);

    // Ambil truk berdasarkan ID
    const truk = await getTruckById('TRK001');
    console.log("Detail TRK001:", truk);

    // Simpan log dummy
    const log = await insertLogger({
      id_truk: 'TRK001',
      berat_aktual: 28000,
      panjang_aktual: 1180,
      lebar_aktual: 240,
      tinggi_aktual: 390,
      status: 'OK'
    });
    console.log("Log baru:", log);

    // Ambil semua log
    const logs = await getAllLogs();
    console.log("Riwayat log:", logs);

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();
