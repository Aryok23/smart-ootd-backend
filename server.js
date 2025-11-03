import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import cors from "cors";
import { loginUser } from "./src/services/auth.js";
import {
  getAllLogs,
  insertLogger,
  deleteLogById,
} from "./src/services/logger.js"; // import fungsi DB kamu
import { warmupDbClients } from "./src/config/warmup.js";
import { getAllTrucks, manualMeasure } from "./src/services/trucks.js";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/" });

app.use(cors());
app.use(express.json()); // parse JSON body

// --- Helper untuk broadcast ke semua client WebSocket ---
function broadcast(message) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(message));
    }
  });
}

// --- WEBSOCKET CONNECTION ---
wss.on("connection", async (ws) => {
  console.log("🟢 Client connected");
  try {
    // Kirim semua logs saat pertama terkoneksi
    const initialLogs = await getAllLogs();
    const message = { type: "initial", data: initialLogs };
    console.log("Sending initial logs:", message);
    ws.send(JSON.stringify(message));
  } catch (err) {
    console.error("Error fetching initial logs:", err);
    ws.send(JSON.stringify({ type: "error", message: "Failed to fetch logs" }));
  }
  ws.on("close", () => console.log("🔴 Client disconnected"));
});

// --- API ENDPOINTS ---
// --- Endpoint HTTP dasar ---
app.get("/", (req, res) => {
  res.send("🚛 Realtime Logger WebSocket Server running");
});

// --- Endpoint HTTP untuk mendapatkan semua data truk ---
app.get("/trucks", async (req, res) => {
  try {
    const logs = await getAllTrucks();
    res.status(200).json({ data: logs });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ message: "Failed to fetch logs" });
  }
});

// --- Endpoint HTTP untuk input manual truk untuk pengukuran Overload dan Overdimension---
app.post("/truck/manual/:nomorKendaraan", async (req, res) => {
  try {
    const nomorKendaraan = req.params.nomorKendaraan;
    // Implement manual truck ID input logic here
    await manualMeasure(nomorKendaraan);
    // For example, you might want to log this action or update a database
    res.status(200).json({
      message: `Manual truck ID ${nomorKendaraan} processed successfully`,
    });
  } catch (error) {
    console.error("Error during manual truck ID input:", error);
    res.status(500).json({ message: "Manual truck ID input failed" });
  }
});

// --- Endpoint HTTP untuk mendapatkan semua logs ---
app.get("/logs", async (req, res) => {
  try {
    const logs = await getAllLogs();
    res.status(200).json({ data: logs });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ message: "Failed to fetch logs" });
  }
});

// --- Endpoint HTTP untuk insert log baru ---
app.post("/logs", async (req, res) => {
  try {
    const newLogData = req.body;
    const newLog = await insertLogger(newLogData);

    // Kirimkan log baru ke semua client WebSocket
    broadcast({ type: "update", data: newLog });
    res.status(201).json({ message: "Log inserted", data: newLog });
  } catch (error) {
    console.error("Error inserting log:", error);
    res.status(500).json({ message: "Failed to insert log" });
  }
});

// --- Endpoint HTTP untuk menghapus log berdasarkan id ---
app.delete("/logs/:id", async (req, res) => {
  try {
    // hapus log berdasarkan id
    const logId = req.params.id;
    await deleteLogById(logId);
    res.status(204).json({ message: `Log With id ${logId} has been Deleted` });
  } catch (error) {
    console.error("Error deleting logs:", error);
    res.status(500).json({ message: "Failed to delete logs" });
  }
});

// --- Endpoint HTTP untuk login ---
app.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    // Implement login logic here
    await loginUser(username, password);
    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

// --- Jalankan server ---
const PORT = 3000;
(async () => {
  await warmupDbClients(parseInt(process.env.PG_WARMUP_CLIENTS, 10) || 5);
  server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`)); // <-- INI YANG BENAR
})();
