const redisClient = require('../config/redis');

const ROOM_TTL_SECONDS = 1800; // Room automatically 30 minutes me expire ho jayega
const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// 1. CREATE ROOM IN REDIS
const createRoom = async (hostUser, betAmount) => {
  let roomCode = generateRoomCode();
  let key = `battle_room:${roomCode}`;

  // Check karo ki Redis me duplicate code na ho
  let exists = await redisClient.exists(key);
  while (exists) {
    roomCode = generateRoomCode();
    key = `battle_room:${roomCode}`;
    exists = await redisClient.exists(key);
  }

  const roomData = {
    roomCode,
    host: {
      userId: hostUser._id.toString(),
      username: hostUser.firstname,
      score: hostUser.score,
      socketId: null,
      isReady: false
    },
    guest: null,
    betAmount: Number(betAmount),
    status: 'WAITING', // WAITING, IN_PROGRESS, COMPLETED
    problemId: null,
    startTime: null
  };

  // Redis me JSON String banakar store karenge with Expiry Time (30 mins)
  await redisClient.setEx(key, ROOM_TTL_SECONDS, JSON.stringify(roomData));
  return roomData;
};

// 2. GET ROOM FROM REDIS
const getRoom = async (roomCode) => {
  if (!roomCode) return null;
  const key = `battle_room:${roomCode.toUpperCase()}`;
  const rawData = await redisClient.get(key);
  
  if (!rawData) return null;
  return JSON.parse(rawData);
};

// 3. JOIN ROOM IN REDIS
const joinRoom = async (roomCode, guestUser) => {
  const room = await getRoom(roomCode);

  if (!room) return { error: 'Invalid or Expired Room Code!' };
  if (room.status !== 'WAITING') return { error: 'Match already in progress!' };
  if (room.guest) return { error: 'Room is already full!' };
  if (room.host.userId === guestUser._id.toString()) {
    return { error: 'You cannot join your own room!' };
  }

  // Bet points balance check
  if (guestUser.points < room.betAmount) {
    return { error: `Insufficient points! You need at least ${room.betAmount} points.` };
  }

  // Add Guest details
  room.guest = {
    userId: guestUser._id.toString(),
    username: guestUser.firstname,
    points: guestUser.points,
    socketId: null,
    isReady: false
  };

  // Updated room state ko wapas Redis me save karo (retain TTL)
  const key = `battle_room:${roomCode.toUpperCase()}`;
  await redisClient.setEx(key, ROOM_TTL_SECONDS, JSON.stringify(room));

  return { room };
};

// 4. UPDATE ROOM STATE IN REDIS
const updateRoom = async (roomData) => {
  const key = `battle_room:${roomData.roomCode.toUpperCase()}`;
  await redisClient.setEx(key, ROOM_TTL_SECONDS, JSON.stringify(roomData));
};

// 5. REMOVE ROOM FROM REDIS
const removeRoom = async (roomCode) => {
  if (!roomCode) return;
  const key = `battle_room:${roomCode.toUpperCase()}`;
  await redisClient.del(key);
};

module.exports = {
  createRoom,
  getRoom,
  joinRoom,
  updateRoom,
  removeRoom
};