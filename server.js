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
import {
  generateJWTToken,
  verifyJWTToken,
  authenticateToken,
} from "./src/middleware/auth.handler.js";
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/" });
import dotenv from "dotenv";
dotenv.config();
app.use(cors());
app.use(express.json()); // parse JSON body

// ========================================
// --- Helper untuk broadcast ke semua client WebSocket ---
function broadcast(message) {
  let payload;

  if (typeof message === "string") {
    payload = message;
  } else {
    payload = JSON.stringify(message);
  }

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}
// ========================================
// --- MQTT SETUP ---
// ========================================
import client from "./src/mqtt/mqttConnect.js";
const MQTT_URL = process.env.MQTT_URL;
const mqttClient = client;
// mqtt.connect(MQTT_URL, {
//   clientID: "ootd-backend-" + Math.random().toString(16).substr(2, 6),
//   keepalive: 30,
//   reconnectPeriod: 1000,
//   clean: true,
// });

// --- Helper untuk timestamp ---
function logWithTime(...args) {
  const ts = new Date().toISOString();
  console.log(`[${ts}]`, ...args);
}

// --- MQTT Handlers ---
const mqttHandlers = {
  "smart-ootd/truk/request": async (payload) => {
    logWithTime("📥 [MQTT] Truck Request:", payload);
    const newLog = await getTruckById(payload);
    if (!truk) {
      logWithTime(`❌ Truck with ID ${payload.id_truk} not found`);
      publishToMqtt("smart-ootd/truk/response", {
        error: "Truck not found",
        id_truk: payload.id_truk,
      });
      return;
    }

    const response = {
      id_truk: newLog.truk_id,
      kategori: newLog.class_id,
      batas_berat: newLog.max_berat,
      batas_panjang: newLog.panjang_kir,
      batas_lebar: newLog.lebar_kir,
      batas_tinggi: newLog.tinggi_kir,
    };

    publishToMqtt("smart-ootd/truk/response", response);
    logWithTime("🚛 [MQTT] Truck Limits:", newLog);
  },

  "smart-ootd/truk/result": async (payload) => {
    logWithTime("🗑 [MQTT] Insert Log:", payload);
    const insertedLog = await insertLogger(payload);
    logWithTime("✅ [MQTT] Log Inserted:", insertedLog);
    // broadcast({ type: "update", data: payload });
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

    // Cek apakah login bpubliserhasil
    if (!result.success) {
      return res
        .status(401)
        .json({ error: result.message || "Invalid credentials" });
    }

    // Generate JWT token
    const token = generateJWTToken(
      result.user.id,
      result.user.username,
      result.user.email
    );

    // Kirim response sukses
    res.status(200).json({
      token: token,
      username: result.user.username,
      email: result.user.email,
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
// GET - Ambil semua gate dan statusnya
app.get("/gates", async (req, res) => {
  try {
    const gates = await getAllGateName();
    res.status(200).json({ data: gates });
  } catch (error) {
    console.error("Error fetching gates:", error);
    res.status(500).json({ error: "Failed to fetch gates" });
  }
});

// GET - Ambil status gate tertentu
app.get("/gates/:gateId", async (req, res) => {
  try {
    const { gateId } = req.params;
    const gate = await getGateStatus(gateId);

    if (!gate) {
      return res.status(404).json({ error: "Gate not found" });
    }

    res.status(200).json({ data: gate });
  } catch (error) {
    console.error("Error fetching gate status:", error);
    res.status(500).json({ error: "Failed to fetch gate status" });
  }
});

// POST - Set status gate (open/close)
app.post("/gates/:gateId/control", authenticateToken, async (req, res) => {
  try {
    const { gateId } = req.params;
    const { action } = req.body; // "open" atau "close"

    // Validasi action
    if (!action || !["open", "close"].includes(action.toLowerCase())) {
      return res
        .status(400)
        .json({ error: "Invalid action. Use 'open' or 'close'" });
    }

    // Validasi role user
    const userRole = req.user.role || "admin"; // Dari JWT token
    if (userRole !== "admin" && userRole !== "operator") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    // Set gate status
    const status = action.toLowerCase() === "open" ? "OPEN" : "CLOSE";
    const updatedGate = await setGateStatus(gateId, status);

    // Log activity
    console.log(`[GATE] User ${req.user.username} ${action} gate ${gateId}`);

    res.status(200).json({
      message: `Gate ${gateId} ${action} successfully`,
      data: updatedGate,
    });
  } catch (error) {
    console.error("Error controlling gate:", error);
    res.status(500).json({ error: "Failed to control gate" });
  }
});

// POST - Emergency action (open/close all gates)
app.post("/gates/emergency/:action", authenticateToken, async (req, res) => {
  try {
    const { action } = req.params; // "open-all" atau "close-all"

    // Validasi action
    if (!["open-all", "close-all"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    // Validasi role - hanya admin
    const userRole = req.user.role || "admin";
    if (userRole !== "admin") {
      return res
        .status(403)
        .json({ error: "Admin access required for emergency actions" });
    }

    // Ambil semua gate
    const gates = await getAllGateName();
    const status = action === "open-all" ? "OPEN" : "CLOSE";

    // Update semua gate
    const results = await Promise.all(
      gates.map((gate) => setGateStatus((gate.id = "ALL"), status))
    );

    // Log activity
    console.log(
      `[GATE EMERGENCY] User ${req.user.username} executed ${action}`
    );

    res.status(200).json({
      message: `All gates ${
        action === "open-all" ? "opened" : "closed"
      } successfully`,
      data: results,
    });
  } catch (error) {
    console.error("Error in emergency gate control:", error);
    res.status(500).json({ error: "Failed to execute emergency action" });
  }
});

// --- Jalankan server ---
const PORT = 3000;
(async () => {
  await warmupDbClients(parseInt(process.env.PG_WARMUP_CLIENTS, 10) || 5);
  server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`)); // <-- INI YANG BENAR
})();

export { app, server, wss, mqttClient };
