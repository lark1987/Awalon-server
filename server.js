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

let spaceId=''

io.on('connection', (socket) => {
  socket.on('spaceId', (msg) => {
    spaceId=msg
  });
});

const gameNamespace = io.of(`/${spaceId}`);
gameNamespace.on('connection', async(gameSocket) => {

  const sockets = await gameNamespace.fetchSockets();
  sockets.forEach(item=>{console.log(item.id)})

  gameSocket.on('disconnect', async() => {
    const sockets = await gameNamespace.fetchSockets();
    sockets.forEach(item=>{console.log(item.id)})


  });
});



server.listen(4000, () => {
  console.log('伺服器運行在 http://localhost:4000');
});