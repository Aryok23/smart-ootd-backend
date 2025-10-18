// src/mqtt/client.js
require('dotenv').config();
const mqtt = require('mqtt');
const { getTruckById, insertLogger } = require('../services/trucks');

const BROKER_URL = process.env.MQTT_URL;

// Helper untuk timestamp
function logWithTime(...args) {
  const ts = new Date().toISOString();
  console.log(`[${ts}]`, ...args);
}

const client = mqtt.connect(BROKER_URL, {
  clientId: `backend-${Math.random().toString(16).slice(2, 8)}`, // unik tiap run
  clean: true,
  reconnectPeriod: 1000, // auto reconnect 1s
});

client.on('connect', () => {
  logWithTime('Connected to Aedes broker:', BROKER_URL);

  // Subscribe ke topik
  client.subscribe([
    'smart-ootd/truk/request',
    'smart-ootd/truk/result',
  ], (err) => {
    if (err) logWithTime('Subscribe error:', err.message);
    else logWithTime('Subscribed to truck topics');
  });
});

client.on('error', (err) => {
  logWithTime('MQTT Client error:', err.message);
});

client.on('message', async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    logWithTime(`Received on ${topic}:`, payload);

    if (topic === 'smart-ootd/truk/request') {
      // Ambil batas truk dari DB
      const truk = await getTruckById(payload.id_truk);

      if (!truk) {
        logWithTime(`Truck ${payload.id_truk} not found`);
        return client.publish(
          'smart-ootd/truk/response',
          JSON.stringify({ error: 'Truck not found', id_truk: payload.id_truk })
        );
      }

      // Format response JSON
      const response = {
        id_truk: truk.id_truk,
        kategori: truk.kategori,
        batas_berat: truk.batas_berat,
        batas_panjang: truk.batas_panjang,
        batas_lebar: truk.batas_lebar,
        batas_tinggi: truk.batas_tinggi,
      };

      client.publish('smart-ootd/truk/response', JSON.stringify(response));
      logWithTime('Sent truck limit:', response);
    }

    if (topic === 'smart-ootd/truk/result') {
      // Simpan hasil ke logger DB
      const log = await insertLogger(payload);
      logWithTime('Log saved:', log);
    }
  } catch (err) {
    logWithTime(`Error processing ${topic}:`, err.message);
  }
});

module.exports = client;
