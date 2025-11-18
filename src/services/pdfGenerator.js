// ============================================
// 1. PDF Generator Service (src/services/pdfGenerator.js)
// ============================================
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

/**
 * Generate PDF report dari data log
 * @param {object} logData - Data log dari database
 * @param {string} outputPath - Path output file PDF
 */
async function generatePDFReport(logData, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      // Buat dokumen PDF
      const doc = new PDFDocument({ margin: 50 });

      // Pipe output ke file
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Header
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("OOTD Vehicle Inspection Report", { align: "center" })
        .moveDown();

      // Informasi Dasar
      doc
        .fontSize(12)
        .font("Helvetica")
        .text(`Report ID: ${logData.id}`)
        .text(
          `Timestamp: ${new Date(logData.timestamp).toLocaleString("id-ID")}`
        )
        .text(`Gate Name: ${logData.gateName || "N/A"}`)
        .text(`Vehicle ID: ${logData.vehicleId}`)
        .text(`License Plate: ${logData.nomorKendaraan || "N/A"}`)
        .moveDown();

      // Divider
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown();

      // Status
      const statusArray = Array.isArray(logData.status)
        ? logData.status
        : [logData.status];

      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("Inspection Status:", { underline: true })
        .moveDown(0.5);

      doc.fontSize(12).font("Helvetica");
      statusArray.forEach((status) => {
        const color = status.toLowerCase().includes("pass") ? "green" : "red";
        doc.fillColor(color).text(`• ${status}`, { indent: 20 });
      });
      doc.fillColor("black").moveDown();

      // Uji KIR (Standar)
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("Standard Specifications (Uji KIR):", { underline: true })
        .moveDown(0.5);

      doc
        .fontSize(12)
        .font("Helvetica")
        .text(`Length: ${logData.uji_kir.length} m`)
        .text(`Width: ${logData.uji_kir.width} m`)
        .text(`Height: ${logData.uji_kir.height} m`)
        .text(`Weight: ${logData.uji_kir.weight} kg`)
        .moveDown();

      // Class Dimensions (Batas Maksimal)
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("Maximum Allowed Dimensions:", { underline: true })
        .moveDown(0.5);

      doc
        .fontSize(12)
        .font("Helvetica")
        .text(`Length: ${logData.classDimensions.length} m`)
        .text(`Width: ${logData.classDimensions.width} m`)
        .text(`Height: ${logData.classDimensions.height} m`)
        .moveDown();

      // Sensor Readings (Hasil Pengukuran)
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("Actual Sensor Readings:", { underline: true })
        .moveDown(0.5);

      doc
        .fontSize(12)
        .font("Helvetica")
        .text(`Weight: ${logData.sensorReadings.weight} kg`)
        .text(`Length: ${logData.sensorReadings.length} m`)
        .text(`Width: ${logData.sensorReadings.width} m`)
        .text(`Height: ${logData.sensorReadings.height} m`)
        .moveDown();

      // Footer
      doc
        .moveDown(2)
        .fontSize(10)
        .font("Helvetica")
        .text(`Generated on ${new Date().toLocaleString("id-ID")}`, {
          align: "center",
        })
        .text("Smart OOTD System - Automated Vehicle Inspection", {
          align: "center",
        });

      // Finalize PDF
      doc.end();

      stream.on("finish", () => {
        console.log(`✅ PDF generated: ${outputPath}`);
        resolve(outputPath);
      });

      stream.on("error", (err) => {
        console.error("Error writing PDF:", err);
        reject(err);
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      reject(error);
    }
  });
}

export { generatePDFReport };
