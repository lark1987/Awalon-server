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

  // 此區為連線 socket 取得 spaceId

  socket.on('spaceId', (spaceId) => {
    console.log('我是spaceId',spaceId)
    socket.emit('answer','收到spaceId了！')

    const myNamespace = io.of(`/${spaceId}`);
    myNamespace.on('connection', (roomSocket) => {

      // 此區為連線 Namespace，處理線上人數。

      roomSocket.on('setUserName', (userName,userId) => {
        users[roomSocket.id]={'spaceId':spaceId,'userName':userName,'userId':userId}
      })

      roomSocket.on('disconnect',() => {
        delete users[roomSocket.id]
        const roomUsers = Object.values(users).filter(user => user.spaceId === spaceId);
        myNamespace.emit('onlineUsers',roomUsers)
      })

      roomSocket.on('getOnlineUsers',() => {
        const roomUsers = Object.values(users).filter(user => user.spaceId === spaceId);
        myNamespace.emit('onlineUsers',roomUsers)
        console.log('我是getOnlineUsers',users)
      })


      // 此區為 產生角色按鈕 > 區分好人壞人的 room

      roomSocket.on('getRoleButton', (newList) => {
        myNamespace.emit('roleButton',newList)
      });

      roomSocket.on('joinGood', () => {
        roomSocket.join('goodPeople');
        myNamespace.to('goodPeople').emit('groupMessage','歡迎加入好人陣營');
      });
    
      roomSocket.on('joinBad', () => {
        roomSocket.join('badPeople');
        myNamespace.to('badPeople').emit('groupMessage','歡迎加入壞人陣營');
      });

    });

  });
});



server.listen(4000, () => {
  console.log('伺服器運行在 http://localhost:4000');
});