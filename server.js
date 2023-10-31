const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true
  }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});




const roomData = {};

io.on("connection", (socket) => {

  socket.on('joinRoom', (roomName) => {
    socket.join(roomName);
    io.to(roomName).emit('roomNotification', `使用者進入了房間: ${roomName}`);

  });

  socket.on('leaveRoom', (roomName) => {
    socket.leave(roomName);
    io.to(roomName).emit('roomNotification', `使用者離開了房間: ${roomName}`);
  });

  socket.on('disconnect', () => {
    console.log('客戶端斷開連線');
  });

});


server.listen(4000, () => {
  console.log('伺服器運行在 http://localhost:4000');
});