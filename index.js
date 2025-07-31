const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

const io = new Server(server);
const wss = new WebSocket.Server({ noServer: true });

let espSocket = null;

// Handle raw WebSocket from ESP
wss.on('connection', (ws) => {
  console.log('ESP connected!');
  espSocket = ws;

  ws.on('message', (msg) => {
    console.log('From ESP:', msg.toString());
    io.emit('esp-message', msg.toString());
  });

  ws.on('close', () => {
    console.log('ESP disconnected');
    espSocket = null;
  });
});

// Handle Socket.IO from browser
io.on('connection', (socket) => {
  console.log('Browser connected');

  socket.on('web-command', (msg) => {
    console.log('Web says:', msg);
    if (espSocket && espSocket.readyState === WebSocket.OPEN) {
      espSocket.send(msg);
    }
  });
});

// Handle upgrade from HTTP to WebSocket
server.on('upgrade', (req, socket, head) => {
  if (req.url === '/esp') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

server.listen(8080, () => {
  console.log("Server running at http://localhost:8080");
});
