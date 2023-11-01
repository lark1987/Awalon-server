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
const goodPeople = [];
const badPeople = [];

io.on('connection', (socket) => {

  // 此區為連線 socket 取得 spaceId

  socket.on('spaceId', (spaceId) => {
    console.log('我是spaceId',spaceId)
    socket.emit('answer','收到spaceId了！')

    const myNamespace = io.of(`/${spaceId}`);
    myNamespace.on('connection', (roomSocket) => {

      // 此區為連線 Namespace，處理線上人數。

      roomSocket.on('setUserName', (userName) => {
        users[roomSocket.id]={'spaceId':spaceId,'userName':userName,}
      })

      roomSocket.on('disconnect',() => {
        delete users[roomSocket.id]
      })

      roomSocket.on('getOnlineUsers',() => {
        roomSocket.emit('onlineUsers',users)
        console.log('我是getOnlineUsers',users)
      })


      // 此區為區分好人壞人的 room

      roomSocket.on('joinGood', () => {
        roomSocket.join('goodPeople');
      });
    
      roomSocket.on('joinBad', () => {
        roomSocket.join('badPeople');
      });

      roomSocket.on('checkGroup', () => {
        myNamespace.to('goodPeople').emit('groupMessage','歡迎加入好人陣營');
        myNamespace.to('badPeople').emit('groupMessage','歡迎加入壞人陣營');
      });

    });

  });
});



server.listen(4000, () => {
  console.log('伺服器運行在 http://localhost:4000');
});