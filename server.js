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
import {
  getAllTrucks,
  getTruckById,
  manualMeasure,
} from "./src/services/trucks.js";
import {
  setGateStatus,
  getGateStatus,
  getAllGateName,
} from "./src/services/gate.js";
import mqtt from "mqtt";
import { publishToMqtt } from "./src/mqtt/mqttPublisher.js";
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
// ========================================
// --- MQTT SETUP ---
// ========================================
const MQTT_URL = process.env.MQTT_URL;
const mqttClient = mqtt.connect(MQTT_URL, {
  clientID: "ootd-backend-" + Math.random().toString(16).substr(2, 6),
  keepalive: 30,
  reconnectPeriod: 1000,
  clean: true,
});

// --- Helper untuk timestamp ---
function logWithTime(...args) {
  const ts = new Date().toISOString();
  console.log(`[${ts}]`, ...args);
}

// --- MQTT Handlers ---
const mqttHandlers = {
  "smart-ootd/truk/request": async (payload) => {
    logWithTime("📥 [MQTT] Insert Log:", payload);
    const newLog = await getTruckById(payload);
    logWithTime("🚛 [MQTT] Truck Limits:", newLog);
  },

  "smart-ootd/truk/result": async (payload) => {
    logWithTime("🗑 [MQTT] Insert Log:", payload);
    const insertedLog = await insertLogger(payload);
    logWithTime("✅ [MQTT] Log Inserted:", insertedLog);
    broadcast({ type: "update", data: payload });
  },

  // "truck/manual": async (payload) => {
  //   console.log("⚙️ [MQTT] Manual Measure:", payload.nomorKendaraan);
  //   await manualMeasure(payload.nomorKendaraan);
  //   broadcast({ type: "manual", data: payload });
  // },
};

// --- Connect to Subscription Topics ---
mqttClient.on("connect", () => {
  console.log("📡 Connected to MQTT broker:", MQTT_URL);
  Object.keys(mqttHandlers).forEach((topic) => {
    mqttClient.subscribe(topic, (err) => {
      if (err)
        console.error(`❌ Failed to subscribe to ${topic}:`, err.message);
      else console.log(`✅ Subscribed to topic: ${topic}`);
    });
  });
});

// --- MQTT Message Handler ---
mqttClient.on("error", (err) => {
  logWithTime("MQTT Client Error:", err.message);
});
mqttClient.on("message", async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    const handler = mqttHandlers[topic];
    if (handler) {
      await handler(payload);
    } else {
      logWithTime("⚠️ [MQTT] No handler for topic:", topic);
    }
  } catch (err) {
    logWithTime("❌ [MQTT] Error handling message:", err);
  }
});

// ========================================
// --- WEBSOCKET CONNECTION ---
// ========================================
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

// ========================================
// --- API ENDPOINTS ---
// ========================================
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

    // Validasi input
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    // Login user
    const result = await loginUser(username, password);
    console.log("Login result:", result);
    // Cek apakah login berhasil
    if (!result.success) {
      return res
        .status(401)
        .json({ error: result.message || "Invalid credentials" });
    }

    // Generate token (untuk sekarang pakai token sederhana, nanti bisa pakai JWT)
    const token = generateSimpleToken(result.user.id, result.user.username);

    // Kirim response sukses dengan token dan role
    res.status(200).json({
      token: token,
      role: result.user.role || "admin", // Sesuaikan dengan kolom role di database
      message: "Login successful",
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Fungsi helper untuk generate token sederhana
// Nanti bisa diganti dengan JWT
function generateSimpleToken(userId, username) {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2);
  return `${userId}-${username}-${timestamp}-${randomStr}`;
}

// --- Gate API ENDPOINTS ---
app.get("/gates/names", async (req, res) => {
  try {
    const gateNames = await getAllGateName();
    res.status(200).json({ data: gateNames });
  } catch (error) {
    console.error("Error fetching gate names:", error);
    res.status(500).json({ message: "Failed to fetch gate names" });
  }
});

// --- Jalankan server ---
const PORT = 3000;
(async () => {
  await warmupDbClients(parseInt(process.env.PG_WARMUP_CLIENTS, 10) || 5);
  server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`)); // <-- INI YANG BENAR
})();

export { app, server, wss, mqttClient };
