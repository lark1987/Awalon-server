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

const users = {};

io.on('connection', (socket) => {

  socket.on('spaceId', (spaceId) => {
    console.log('我是spaceId',spaceId)
    socket.emit('answer','收到spaceId了！')

    const myNamespace = io.of(`/${spaceId}`);
    myNamespace.on('connection', (roomSocket) => {

      roomSocket.on('setUserName', (userName) => {
        users[roomSocket.id]={'spaceId':spaceId,'userName':userName,}
        console.log('我是users',users)
      })

      roomSocket.on('disconnect',() => {
        delete users[roomSocket.id]
        console.log('我是users',users)
      })

    });

  });
});



server.listen(4000, () => {
  console.log('伺服器運行在 http://localhost:4000');
});