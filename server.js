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


// io.disconnectSockets();


const customNamespace = io.of('/123456');

customNamespace.on('connection', async(socket) => {

  const sockets = await io.of("/123456").fetchSockets();
  sockets.forEach(item=>{console.log(item.id)})

  socket.on('disconnect', async() => {
    const sockets = await io.of("/123456").fetchSockets();
    sockets.forEach(item=>{console.log(item.id)})
  });

})









server.listen(4000, () => {
  console.log('伺服器運行在 http://localhost:4000');
});