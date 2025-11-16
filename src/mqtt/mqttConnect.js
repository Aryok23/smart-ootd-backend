// src/mqtt/client.js
import mqtt from "mqtt";
import dotenv from "dotenv";

dotenv.config();

const MQTT_URL = process.env.MQTT_URL || "mqtt://localhost:1883";

const options = {
  clientId: "smart-ootd-" + Math.random().toString(16).slice(2, 8),
  clean: true,
  keepalive: 30,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
};

// Buat 1 instance client saja
const client = mqtt.connect(MQTT_URL, options);

// Logging events
client.on("connect", () => {
  console.log("📡 [MQTT] Connected to broker:", MQTT_URL);
});

client.on("reconnect", () => {
  console.log("🔄 [MQTT] Reconnecting...");
});

client.on("error", (err) => {
  console.error("❌ [MQTT] Connection error:", err.message);
});

client.on("close", () => {
  console.warn("⚠️ [MQTT] Connection closed");
});

// Export client yang sama untuk dipakai di publish & subscribe
export default client;
