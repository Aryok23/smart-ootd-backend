// src/mqtt/simulator-full.js
require('dotenv').config();

const mqtt = require('mqtt');

const BROKER_URL = process.env.MQTT_BROKER;
const TRUCK_ID = 'TRK001';

// Buat koneksi ke broker
const client = mqtt.connect(BROKER_URL);

client.on('connect', () => {
  console.log('STM32 Dummy connected to broker');

  // 1. Kirim request batas truk
  const request = { id_truk: TRUCK_ID };

  try {
    client.publish('smart-ootd/truk/request', JSON.stringify(request), { qos: 1 }, (err) => {
      if (err) {
        console.error('Publish error (request):', err.message);
      } else {
        console.log('Sent request:', request);
      }
    });
  } catch (err) {
    console.error('Error serializing request:', err.message);
  }

  // 2. Subscribe ke response
  client.subscribe('smart-ootd/truk/response', { qos: 1 }, (err) => {
    if (err) {
      console.error('Subscribe error:', err.message);
    } else {
      console.log('Subscribed to smart-ootd/truk/response');
    }
  });
});

// Handler pesan masuk
client.on('message', (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    console.log(`Received on ${topic}:`, payload);

    if (topic === 'smart-ootd/truk/response') {
      // 3. Setelah dapat batas → kirim hasil sensor (simulasi STM32)
      const result = {
        id_truk: payload.id_truk,
        berat_aktual: 28000,
        panjang_aktual: 1180,
        lebar_aktual: 240,
        tinggi_aktual: 390,
        status: 'OK',
      };

      client.publish('smart-ootd/truk/result', JSON.stringify(result), { qos: 1 }, (err) => {
        if (err) {
          console.error('Publish error (result):', err.message);
        } else {
          console.log('Sent result:', result);
        }
      });
    }
  } catch (err) {
    console.error('Error processing message:', err.message);
  }
});

// Tangani error koneksi
client.on('error', (err) => {
  console.error('MQTT client error:', err.message);
  client.end();
});
