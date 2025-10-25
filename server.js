import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import cors from "cors";
import { getAllLogs, insertLogger } from "./src/services/logger.js"; // import fungsi DB kamu
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/" });
app.use(cors());
app.use(express.json()); // parse JSON body

// // --- Helper untuk broadcast ke semua client WebSocket ---
function broadcast(message) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(message));
    }
  });
}

// --- WebSocket connection ---
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

// --- Endpoint HTTP dasar ---
app.get("/", (req, res) => {
  res.send("🚛 Realtime Logger WebSocket Server running");
});

// --- Jalankan server ---
server.listen(3000, () => {
  console.log("✅ Server running on http://localhost:3000");
});
