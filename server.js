
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

const options = {
  // origin: "http://15.168.102.124:3000",
  // origin: "https://awalon.vercel.app",
  origin: "http://localhost:3000",
  methods: '*',
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(options));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    // origin: "http://15.168.102.124:3000",
    // origin: "https://awalon.vercel.app",
    origin: "http://localhost:3000",
    credentials: true
  }
});


const users = {};
const goodPeople = {};
const badPeople = {}

const goGame = {}
const vote = {}
const mission = {}

const roomClose = {}



io.on('connection', (socket) => {

    // 此區為連線 socket，進房確認、提供spaceId

  socket.on('roomCheck', (roomId,userName) => {
    if (roomId in roomClose) {
      socket.emit('roomCheck','遊戲中，無法進入')
      return
    }
    const roomUsers = Object.values(users).filter(user => user.spaceId === roomId);
    if(roomUsers.length > 9){
      socket.emit('roomCheck','房間人數已滿')
      return
    }
    const isNamed = roomUsers.some(item => item.userName === userName);
    if(isNamed){
      socket.emit('roomCheck','玩家名稱已被使用')
      return
    }
    socket.emit('roomCheck',false)
  })

  socket.on('spaceId', (spaceId) => {
    socket.emit('spaceId')

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

      // 此區為 產生角色按鈕+房間關閉 > 角色room > 壞人名單

      roomSocket.on('userNumber', (userNumber) => {
        myNamespace.emit('userNumber',userNumber);
        roomClose[spaceId]={'roomId':spaceId};
      });

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

      roomSocket.on('goGame', (userId,userName,roomId) => {

        goGame[userId]={userName,roomId}
        const roomGoGame = Object.values(goGame).filter(item => item.roomId === roomId);
        myNamespace.emit('goGame',roomGoGame)

      });

      roomSocket.on('leaderList', (shuffleList) => {
        myNamespace.emit('leaderList',shuffleList)
      });

      roomSocket.on('leaderAction', (leaderName) => {
        const roomUsers = Object.values(users).filter(user => user.spaceId === spaceId);
        const leader = Object.values(roomUsers).find(user => user.userName === leaderName);
        const leaderId = leader.userId;
        myNamespace.emit('goLeaderWait',leaderName)
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

      roomSocket.on('getMissionFinalResult', (msg,failCount) => {
        myNamespace.emit('getMissionFinalResult',msg,failCount)
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
        if (chooseName !== merlinName){
          myNamespace.emit('goGameOver','刺殺失敗，好人陣營獲勝！');
        }
      });

      roomSocket.on('roomOpen', () => {
        for (let roomCloseId in roomClose) {
          if (roomClose[roomCloseId].roomId === spaceId) {
            delete roomClose[roomCloseId];
          }
        }
      });

      // 處理中：這裡要做角色清單
      roomSocket.on('roleList', () => {
        const goods = Object.values(goodPeople).filter(user => user.spaceId === spaceId);
        const bads = Object.values(badPeople).filter(user => user.spaceId === spaceId);
      });






      // 離線清除區！

      roomSocket.on('disconnect',(reason) => {
        delete users[roomSocket.id]
        delete goodPeople[roomSocket.id]
        delete badPeople[roomSocket.id]

        for (let voteId in vote) {
          if (vote[voteId].roomId === spaceId) {
            delete vote[voteId];
          }
        }

        for (let missionId in mission) {
          if (mission[missionId].roomId === spaceId) {
            delete mission[missionId];
          }
        }

        for (let goGameId in goGame) {
          if (goGame[goGameId].roomId === spaceId) {
            delete goGame[goGameId];
          }
        }

        const roomUsers = Object.values(users).filter(user => user.spaceId === spaceId);
        myNamespace.emit('onlineUsers',roomUsers)




        // roomSocket.removeAllListeners()
      })

    });

  });
});



server.listen(4000, () => {
  console.log('伺服器運行在 http://localhost:4000');
});