
const { initializeApp,  } = require('firebase/app');
const { getFirestore, } = require('firebase/firestore');
const  {addDoc,getDocs,collection,query,where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAxqIh646KLtao8XnKfJc6Lk0P1V1CQzYc",
  authDomain: "wehelpthree-lark1987.firebaseapp.com",
  projectId: "wehelpthree-lark1987",
  storageBucket: "wehelpthree-lark1987.appspot.com",
  messagingSenderId: "716508795071",
  appId: "1:716508795071:web:78297146c3ec13b083360a"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

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
let vote = {}
let mission = {}
let goGame = {}


io.on('connection', (socket) => {

  // 此區為連線 socket 取得 spaceId

  socket.on('spaceId', (spaceId) => {
    console.log('我是spaceId',spaceId)
    socket.emit('answer','收到spaceId了！')

    const myNamespace = io.of(`/${spaceId}`);
    myNamespace.on('connection', (roomSocket) => {



      // 此區處理 人員登記、線上人數。

      roomSocket.on('setUserName', (userName,userId) => {
        users[roomSocket.id]={'spaceId':spaceId,'userName':userName,'userId':userId}
        roomSocket.join(userId);
      })

      roomSocket.on('getOnlineUsers',() => {
        const roomUsers = Object.values(users).filter(user => user.spaceId === spaceId);
        myNamespace.emit('onlineUsers',roomUsers)
      })

      // 此區為 產生角色按鈕 > 好人壞人梅林 room > 通知壞人名單

      roomSocket.on('getRoleButton', (newList) => {
        myNamespace.emit('roleButton',newList)
      });

      roomSocket.on('joinGood', (userName) => {
        roomSocket.join('goodPeople');
        myNamespace.to('goodPeople').emit('groupMessage','歡迎加入好人陣營');
        goodPeople[roomSocket.id]={'spaceId':spaceId,'userName':userName, 'role':'好人'}
      });
    
      roomSocket.on('joinBad', (userName) => {
        roomSocket.join('badPeople');
        myNamespace.to('badPeople').emit('groupMessage','歡迎加入壞人陣營');
        badPeople[roomSocket.id]={'spaceId':spaceId,'userName':userName, 'role':'壞人'}
      });

      roomSocket.on('joinMerlin', (userName) => {
        roomSocket.join('merlin');
        myNamespace.to('merlin').emit('groupMessage','歡迎加入好人陣營，你是梅林！');
        goodPeople[roomSocket.id]={'spaceId':spaceId,'userName':userName, 'role':'梅林'}
      });

      roomSocket.on('joinAssassin', (userName) => {
        roomSocket.join('assassin');
        myNamespace.to('assassin').emit('groupMessage','歡迎加入壞人陣營，你是刺客！');
        badPeople[roomSocket.id]={'spaceId':spaceId,'userName':userName, 'role':'刺客'}
      });

      roomSocket.on('getBadPeopleList', () => {
        const badName = Object.values(badPeople).map(item => item.userName);
        myNamespace.in('merlin').emit('badPeopleList',badName);
        myNamespace.in('badPeople').emit('badPeopleList',badName);
      });

      // 此區為 遊戲一區：確角等候、隊長列表、隊長提名、投票等候

      roomSocket.on('goGame', (userId,userName) => {
        goGame[userId]=userName
        myNamespace.emit('goGame',goGame)
      });

      roomSocket.on('leaderList', (shuffleList) => {
        myNamespace.emit('leaderList',shuffleList)

        const leaderName = shuffleList[0]
        const roomUsers = Object.values(users).filter(user => user.spaceId === spaceId);
        const leader = Object.values(roomUsers).find(user => user.userName === leaderName);
        const leaderId = leader.userId;

        myNamespace.in(leaderId).emit('leaderAction', '你是本局隊長喔');

      });

      roomSocket.on('leaderAction', (leaderName) => {
        const roomUsers = Object.values(users).filter(user => user.spaceId === spaceId);
        const leader = Object.values(roomUsers).find(user => user.userName === leaderName);
        const leaderId = leader.userId;
        myNamespace.in(leaderId).emit('leaderAction', '你是本局隊長喔');
      });

      roomSocket.on('missionRaise', (selectedList,userName) => {
        myNamespace.emit('missionRaise',selectedList,userName)
      });

      roomSocket.on('getVote', (userId,userName,answer,roomId) => {
        vote[userId]={userName,answer,roomId}
        const roomVote = Object.values(vote).filter(item => item.roomId === roomId);
        myNamespace.emit('getVote',roomVote)
      });

      roomSocket.on('getVoteResult', (obj) => {
        myNamespace.emit('getVoteResult',obj)
      });

      roomSocket.on('goMission', (players) => {
        myNamespace.emit('goMissionWait')

        const roomSocketIds = [];
        players.forEach((player) => {
          const roomUsers = Object.values(users).filter(user => user.spaceId === spaceId);
          const user = Object.values(roomUsers).find(user => user.userName === player);
          const userId = user.userId;
          if (userId) {roomSocketIds.push(userId);}
        });
        roomSocketIds.forEach(socketId => {
          myNamespace.in(socketId).emit('goMission', '出任務囉！');
        });

      });

      roomSocket.on('getMissionResult', (userId,answer,roomId) => {
        mission[userId]={answer,roomId}
        const roomMission = Object.values(mission).filter(item => item.roomId === roomId);
        myNamespace.emit('getMissionResult',roomMission)
      });

      roomSocket.on('goNextGame', () => {
        myNamespace.emit('goNextGame')
      });

      roomSocket.on('goGameOver', (msg) => {
        myNamespace.emit('goGameOver',msg)
      });

      roomSocket.on('goAssassin', () => {
        myNamespace.to('assassin').emit('goAssassin');
      });

      roomSocket.on('assassinChoose', (chooseName) => {
        const goods = Object.values(goodPeople).filter(user => user.spaceId === spaceId);
        const user = Object.values(goods).find(user => user.role === '梅林');
        const merlinName = user.userName;
        if (chooseName == merlinName){
          myNamespace.emit('goGameOver','刺殺成功，壞人陣營獲勝！');
        }
        else if (chooseName !== merlinName){
          myNamespace.emit('goGameOver','刺殺失敗，好人陣營獲勝！');
        }
      });

      // 處理中：這裡要做角色清單
      roomSocket.on('roleList', () => {
        const goods = Object.values(goodPeople).filter(user => user.spaceId === spaceId);
        const bads = Object.values(badPeople).filter(user => user.spaceId === spaceId);
      });






      // 離線清除區！

      roomSocket.on('disconnect',() => {
        delete users[roomSocket.id]
        delete goodPeople[roomSocket.id]
        delete badPeople[roomSocket.id]
        vote = {}
        mission = {}
        goGame = {}
        const roomUsers = Object.values(users).filter(user => user.spaceId === spaceId);
        myNamespace.emit('onlineUsers',roomUsers)
        myNamespace.emit('goGame',goGame)
      })

    });

  });
});



server.listen(4000, () => {
  console.log('伺服器運行在 http://localhost:4000');
});
