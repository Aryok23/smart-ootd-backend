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

      // // === HEADER IMAGES ===
      // const leftLogoPath = path.resolve("public/assets/Logo_DTETI_Fix-01.png");
      // const rightLogoPath = path.resolve("public/assets/Logo.png");
      // if (!fs.existsSync(leftLogoPath)) {
      //   console.error("Left logo not found:", leftLogoPath);
      // }
      // if (!fs.existsSync(rightLogoPath)) {
      //   console.error("Right logo not found:", rightLogoPath);
      // }

      // // Logo Kiri (50px dari kiri, 30px dari atas)
      // doc.image(leftLogoPath, 50, 30, { width: 80 });

      // // Logo Kanan (halamanWidth - margin - lebarGambar)
      // doc.image(rightLogoPath, doc.page.width - 130, 30, { width: 80 });
      // // Tambahkan spacing ke bawah setelah header
      // doc.moveDown(4);

      // // Header
      // doc
      //   .fontSize(20)
      //   .font("Helvetica-Bold")
      //   .text("OOTD Vehicle Inspection Report", { align: "center" })
      //   .moveDown();
      // === HEADER AREA ===
      // Tentukan posisi Y dasar agar Logo dan Teks sejajar
      const headerY = 30;
      const logoWidth = 80;

      // Path Logo
      const leftLogoPath = path.resolve("public/assets/Logo_DTETI_Fix-01.png");
      const rightLogoPath = path.resolve("public/assets/Logo.png");

      // 1. Render Logo Kiri (di posisi headerY)
      if (fs.existsSync(leftLogoPath)) {
        doc.image(leftLogoPath, 50, headerY + 10, { width: logoWidth });
      }

      // 2. Render Logo Kanan (di posisi headerY)
      if (fs.existsSync(rightLogoPath)) {
        // Posisi X = Lebar Halaman - Margin Kanan (50) - Lebar Logo
        doc.image(rightLogoPath, doc.page.width - 50 - logoWidth, headerY, {
          width: logoWidth,
        });
      }

      // 3. Render Teks Header
      // HAPUS: doc.moveDown(4); yang menyebabkan teks turun ke bawah.

      // Set posisi Y kursor secara manual.
      // Kita tambahkan offset (+25) agar teks pas di tengah-tengah tinggi logo (vertical align center).
      // Angka 25 ini asumsi tinggi logo sekitar 80px dan font size 20pt.
      doc.y = headerY + 25;

      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("OOTD Vehicle Inspection Report", { align: "center" });

      // 4. Pindahkan kursor ke bawah AREA Header
      // Karena logo menggunakan posisi absolut, teks berikutnya bisa menabrak logo jika kita hanya pakai moveDown().
      // Kita paksa Y turun melewati tinggi logo (+ margin).
      doc.y = headerY + logoWidth + 20;

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
        .text(`Length: ${logData.uji_kir.length} cm`)
        .text(`Width: ${logData.uji_kir.width} cm`)
        .text(`Height: ${logData.uji_kir.height} cm`)
        .text(`Weight: ${logData.uji_kir.weight} g`)
        .moveDown();

      // // Class Dimensions (Batas Maksimal)
      // doc
      //   .fontSize(14)
      //   .font("Helvetica-Bold")
      //   .text("Maximum Allowed Dimensions:", { underline: true })
      //   .moveDown(0.5);

      // doc
      //   .fontSize(12)
      //   .font("Helvetica")
      //   .text(`Length: ${logData.classDimensions.length} cm`)
      //   .text(`Width: ${logData.classDimensions.width} cm`)
      //   .text(`Height: ${logData.classDimensions.height} cm`)
      //   .moveDown();

      // Sensor Readings (Hasil Pengukuran)
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("Actual Sensor Readings:", { underline: true })
        .moveDown(0.5);

      doc
        .fontSize(12)
        .font("Helvetica")
        .text(`Weight: ${logData.sensorReadings.weight} g`)
        .text(`Length: ${logData.sensorReadings.length} cm`)
        .text(`Width: ${logData.sensorReadings.width} cm`)
        .text(`Height: ${logData.sensorReadings.height} cm`)
        .moveDown();

      // Footer
      doc
        .moveDown(2)
        .fontSize(12)
        .font("Helvetica")
        .text(`Generated on ${new Date().toLocaleString("id-ID")}`, {
          align: "center",
        })
        .text("Smart OOTD System - Automated Vehicle Inspection", {
          align: "center",
        })
        .text("by Tim Capstone C-04 DTETI UGM ©2025", { align: "center" });

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
