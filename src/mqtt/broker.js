// src/mqtt/broker.js
require('dotenv').config();
const aedes = require('aedes')();
const net = require('net');

const PORT = process.env.MQTT_PORT;

// Helper untuk timestamp
function logWithTime(...args) {
  const ts = new Date().toISOString();
  console.log(`[${ts}]`, ...args);
}

// Buat TCP server untuk MQTT
const server = net.createServer(aedes.handle);

server.listen(PORT, '0.0.0.0', () => {
  logWithTime(`Aedes broker running on port ${PORT}`);
});

// Logging event client connect/disconnect
aedes.on('client', (client) => {
  logWithTime(`Client connected: ${client?.id || 'unknown'}`);
});

aedes.on('clientDisconnect', (client) => {
  logWithTime(`Client disconnected: ${client?.id || 'unknown'}`);
});

// Logging semua publish
aedes.on('publish', (packet, client) => {
  if (client) {
    logWithTime(
      `Message from ${client.id} | topic: ${packet.topic} | payload: ${packet.payload.toString()}`
    );
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  logWithTime('\nShutting down Aedes broker...');
  server.close(() => {
    logWithTime('Broker closed');
    process.exit(0);
  });
});
