import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path ke folder temp (di root backend)
const TEMP_FOLDER = path.join(__dirname, "../../temp");

/**
 * Pastikan folder temp ada
 */
function ensureTempFolderExists() {
  if (!fs.existsSync(TEMP_FOLDER)) {
    fs.mkdirSync(TEMP_FOLDER, { recursive: true });
    console.log("✅ Temp folder created:", TEMP_FOLDER);
  }
}

/**
 * Generate nama file unik untuk report
 * @param {object} logData - Data log
 * @returns {string} - Nama file
 */
function generateFileName(logData) {
  const timestamp = new Date(logData.timestamp)
    .toISOString()
    .replace(/[:.]/g, "-");
  return `OOTD_Report_${logData.vehicleId}_${logData.id}_${timestamp}.pdf`;
}

/**
 * Cek apakah file sudah ada di folder temp
 * @param {string} fileName - Nama file
 * @returns {boolean} - True jika file ada
 */
function checkFileExists(fileName) {
  const filePath = path.join(TEMP_FOLDER, fileName);
  const exists = fs.existsSync(filePath);

  if (exists) {
    console.log(`✅ File already exists: ${fileName}`);
  } else {
    console.log(`❌ File not found: ${fileName}`);
  }

  return exists;
}

/**
 * Get full path file di temp folder
 * @param {string} fileName - Nama file
 * @returns {string} - Full path
 */
function getFilePath(fileName) {
  return path.join(TEMP_FOLDER, fileName);
}

/**
 * List semua file PDF di folder temp
 * @returns {Array} - Array of file objects
 */
function listAllReports() {
  ensureTempFolderExists();

  const files = fs
    .readdirSync(TEMP_FOLDER)
    .filter((file) => file.endsWith(".pdf"))
    .map((file) => {
      const filePath = path.join(TEMP_FOLDER, file);
      const stats = fs.statSync(filePath);

      return {
        name: file,
        path: filePath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    })
    .sort((a, b) => b.modified - a.modified); // Sort by newest first

  return files;
}

/**
 * Delete file dari temp folder
 * @param {string} fileName - Nama file
 * @returns {boolean} - True jika berhasil
 */
function deleteFile(fileName) {
  try {
    const filePath = path.join(TEMP_FOLDER, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ File deleted: ${fileName}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error deleting file ${fileName}:`, error);
    return false;
  }
}

/**
 * Clean up old files (older than X days)
 * @param {number} days - Jumlah hari (default: 7)
 */
function cleanupOldFiles(days = 7) {
  ensureTempFolderExists();

  const now = Date.now();
  const maxAge = days * 24 * 60 * 60 * 1000; // Convert days to milliseconds

  const files = fs.readdirSync(TEMP_FOLDER);
  let deletedCount = 0;

  files.forEach((file) => {
    const filePath = path.join(TEMP_FOLDER, file);
    const stats = fs.statSync(filePath);
    const age = now - stats.mtime.getTime();

    if (age > maxAge) {
      fs.unlinkSync(filePath);
      deletedCount++;
      console.log(`🗑️ Deleted old file: ${file}`);
    }
  });

  console.log(`✅ Cleanup complete. Deleted ${deletedCount} old files.`);
  return deletedCount;
}

export {
  ensureTempFolderExists,
  generateFileName,
  checkFileExists,
  getFilePath,
  listAllReports,
  deleteFile,
  cleanupOldFiles,
  TEMP_FOLDER,
};
