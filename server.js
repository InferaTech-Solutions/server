// FILE: server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws');
const path = require('path');

const app = express();

// Serve frontend from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Create HTTP server with Express app
const server = http.createServer(app);

// Set up socket.io on the HTTP server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  }
});

// Create WebSocket server manually for ESP raw WebSocket
const wss = new WebSocket.Server({ noServer: true });

let espSocket = null;

// ESP WebSocket client handler
wss.on('connection', (ws) => {
  console.log('ESP8266/ESP32 connected');
  espSocket = ws;

  ws.on('message', (msg) => {
    console.log('From ESP:', msg);
    io.emit('esp-message', msg);
  });

  ws.on('close', () => {
    console.log('ESP disconnected');
    espSocket = null;
  });
});

// Browser socket.io client handler
io.on('connection', (socket) => {
  console.log('Browser client connected');

  socket.on('web-command', (msg) => {
    console.log('From Web:', msg);
    if (espSocket && espSocket.readyState === WebSocket.OPEN) {
      espSocket.send(msg);
    }
  });
});

// Handle HTTP upgrade for ESP raw WebSocket
server.on('upgrade', (req, socket, head) => {
  if (req.url === '/esp') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

// Start server
const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Use ws://<IP>:${PORT}/esp for ESP8266/ESP32 connection`);
});
