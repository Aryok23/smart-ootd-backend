const express = require("express");
const fs = require("fs");
const { google } = require("googleapis");

const router = express.Router();

// Setup Drive
const auth = new google.auth.GoogleAuth({
  keyFile: "service-account.json",
  scopes: ["https://www.googleapis.com/auth/drive"],
});
const drive = google.drive({ version: "v3", auth });

// MAIN ROUTE
router.get("/export", async (req, res) => {
  const folderName = "NAME";
  const fileName = "report.pdf";
  const filePath = "./exports/report.pdf"; // file lokal yang kamu buat sebelumnya
  const mimeType = "application/pdf";

  try {
    // 1. Cari folder
    const folderId = await findFolderId(drive, folderName);
    if (!folderId) return res.status(400).send("Folder tidak ditemukan");

    // 2. Cek apakah file sudah ada
    const existing = await checkFileExists(drive, folderId, fileName);

    if (existing) {
      console.log("File sudah ada → ambil dari Drive");
      return downloadFile(drive, existing.id, res);
    }

    // 3. Jika belum ada → upload ke folder
    console.log("File belum ada → upload...");
    const uploadedFile = await uploadToFolder(
      drive,
      folderId,
      fileName,
      mimeType,
      filePath
    );

    // 4. Kirim file hasil upload ke frontend
    return downloadFile(drive, uploadedFile.id, res);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});
