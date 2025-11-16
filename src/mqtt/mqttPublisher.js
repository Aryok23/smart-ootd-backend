// mqttPublisher.js
import mqtt from "mqtt";
import client from "./mqttConnect.js";

// ===============================
// Konfigurasi MQTT
// ===============================
// const options = {
//   clientId: "smart-ootd-publisher-" + Math.random().toString(16).slice(2),
//   clean: true,
//   keepalive: 30,
//   connectTimeout: 4000,
//   reconnectPeriod: 1000,
// };

const brokerUrl = process.env.MQTT_URL || "mqtt://localhost:1883";
// const client = mqtt.connect(brokerUrl, options);

// ===============================
// Logging event koneksi
// ===============================
// client.on("connect", () => {
//   console.log("[MQTT] ✅ Connected to broker:", brokerUrl);
// });

// client.on("reconnect", () => {
//   console.log("[MQTT] 🔄 Reconnecting...");
// });

// client.on("error", (err) => {
//   console.error("[MQTT] ❌ Connection error:", err.message);
// });

// client.on("close", () => {
//   console.warn("[MQTT] ⚠️ Connection closed.");
// });

// ===============================
// Fungsi utilitas publish canggih
// ===============================
/**
 * Publish message ke topic tertentu
 * @param {string} topic - Nama topic MQTT
 * @param {object} payload - Data yang akan dikirim
 * @param {object} [options] - QoS dan Retain optional
 */
export async function publishToMqtt(
  topic,
  payload,
  options = { qos: 1, retain: false }
) {
  if (!client.connected) {
    console.warn("[MQTT] ⏳ Broker belum siap, menunggu koneksi...");
    await waitForConnection();
  }

  // Validasi JSON
  let message;
  // Jika payload STRING → kirim apa adanya
  if (typeof payload === "string") {
    message = payload;
  } else {
    // Jika payload OBJECT → JSON.stringify
    try {
      message = JSON.stringify(payload);
    } catch (e) {
      console.error("[MQTT] ❌ Payload bukan JSON valid:", e.message);
      return;
    }
  }

  client.publish(topic, message, options, (err) => {
    if (err) {
      console.error(`[MQTT] ❌ Gagal publish ke ${topic}:`, err.message);
    } else {
      console.log(`[MQTT] 📤 Published ke ${topic}:`, message);
    }
  });
}

// ===============================
// Helper: tunggu koneksi jika belum tersambung
// ===============================
function waitForConnection() {
  return new Promise((resolve) => {
    if (client.connected) return resolve();
    client.once("connect", resolve);
  });
}

// ===============================
// Contoh penggunaan
// ===============================
if (process.argv[1].includes("mqttPublisher.js")) {
  const topic = "smart-ootd/truk/response";
  const payload = {
    id_truk: 1,
    status: "verified",
    timestamp: new Date().toISOString(),
    sensor_data: {
      panjang: 6.5,
      lebar: 2.4,
      tinggi: 3.2,
      berat: 8200,
    },
  };

  publishToMqtt(topic, payload, { qos: 1, retain: false });
}
