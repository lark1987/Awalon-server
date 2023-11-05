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
const goodPeople = {};
const badPeople = {}


io.on('connection', (socket) => {

  // 此區為連線 socket 取得 spaceId

  socket.on('spaceId', (spaceId) => {
    console.log('我是spaceId',spaceId)
    socket.emit('answer','收到spaceId了！')

    const myNamespace = io.of(`/${spaceId}`);
    myNamespace.on('connection', (roomSocket) => {

      // 此區處理 線上人數、離線清除。

      roomSocket.on('setUserName', (userName,userId) => {
        users[roomSocket.id]={'spaceId':spaceId,'userName':userName,'userId':userId}
      })

      roomSocket.on('getOnlineUsers',() => {
        const roomUsers = Object.values(users).filter(user => user.spaceId === spaceId);
        myNamespace.emit('onlineUsers',roomUsers)
        console.log('我是getOnlineUsers',users)
      })

      roomSocket.on('disconnect',() => {
        delete users[roomSocket.id]
        delete goodPeople[roomSocket.id]
        const roomUsers = Object.values(users).filter(user => user.spaceId === spaceId);
        myNamespace.emit('onlineUsers',roomUsers)
      })




      // 此區為 產生角色按鈕 > 好人壞人 room

      roomSocket.on('getRoleButton', (newList) => {
        myNamespace.emit('roleButton',newList)
      });

      roomSocket.on('joinGood', (userName) => {
        roomSocket.join('goodPeople');
        myNamespace.to('goodPeople').emit('groupMessage','歡迎加入好人陣營');
        goodPeople[roomSocket.id]={'spaceId':spaceId,'userName':userName}
      });
    
      roomSocket.on('joinBad', (userName) => {
        roomSocket.join('badPeople');
        myNamespace.to('badPeople').emit('groupMessage','歡迎加入壞人陣營');
        badPeople[roomSocket.id]={'spaceId':spaceId,'userName':userName}
      });

      // 進度到這裡，要把梅林抓出來

      roomSocket.on('getBadPeopleList', () => {
        myNamespace.to('badPeople').emit('badPeopleList',badPeople);
      });

      




      

      

    });

  });
});



server.listen(4000, () => {
  console.log('伺服器運行在 http://localhost:4000');
});




        // for (const socket of sockets) {
        //   console.log(socket.id);
        // }

        // const sockets = await myNamespace.in("goodPeople").fetchSockets();
        // const randomIndex = Math.floor(Math.random() * sockets.length);
        // const randomSocket = sockets[randomIndex].id;
        // console.log(randomSocket)