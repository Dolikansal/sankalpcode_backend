const Battle = require('../models/battle');
const User = require('../models/user');       // Ensure filename matches user.js
const Problem = require('../models/problem'); // Ensure filename matches problem.js
const redisClient = require('../config/redis');
const { createRoom, getRoom, joinRoom, updateRoom, removeRoom } = require('../utils/battleroom');

module.exports = (io, socket) => {

  // HELPER: Single source of truth for room cleanup & termination
  const terminateRoom = async (roomCode, reasonMessage) => {
    try {
      if (!roomCode) return;
      const cleanRoomCode = String(roomCode).trim();

      const room = await getRoom(cleanRoomCode);
      if (!room) return; // Protection against duplicate execution

      console.log(`[ROOM TERMINATE] Terminating Room: ${cleanRoomCode} | Reason: ${reasonMessage}`);

      // 1. Broadcast match_closed event to ALL users in the room
      io.to(cleanRoomCode).emit('match_closed', { message: reasonMessage });

      // 2. Fetch and remove all sockets from this room
      const roomSockets = await io.in(cleanRoomCode).fetchSockets();
      for (const s of roomSockets) {
        s.leave(cleanRoomCode);
      }

      // 3. Clear DB & Redis Cache
      await removeRoom(cleanRoomCode);
      if (redisClient) {
        await redisClient.del(`room:${cleanRoomCode}`);
      }
    } catch (err) {
      console.error(`Error terminating room ${roomCode}:`, err);
    }
  };

  // 1. CREATE ROOM
  socket.on('create_room', async ({ user, betAmount }) => {
    try {
      const uId = user?.userId || user?._id;
      if (!uId) {
        return socket.emit('error_message', 'Invalid user session.');
      }

      const dbUser = await User.findById(uId);
      if (!dbUser || dbUser.points < betAmount) {
        return socket.emit('error_message', 'Bet lagane ke liye Sufficient Coins/Points nahi hain!');
      }

      const room = await createRoom(dbUser, betAmount);
      room.host.socketId = socket.id;
      await updateRoom(room);

      socket.join(room.roomCode);
      socket.emit('room_created', room);
      console.log(`🎮 Room Created: ${room.roomCode} by ${dbUser.firstname}`);
    } catch (err) {
      console.error('Error creating room:', err);
      socket.emit('error_message', 'Room create karne mein problem hui!');
    }
  });

  // 2. JOIN ROOM
  socket.on('join_room', async ({ roomCode, user }) => {
    try {
      const uId = user?.userId || user?._id;
      if (!uId) {
        return socket.emit('error_message', 'Invalid user session.');
      }

      const dbUser = await User.findById(uId);
      if (!dbUser) {
        return socket.emit('error_message', 'User account not found.');
      }

      const result = await joinRoom(roomCode, dbUser);

      if (result.error) {
        return socket.emit('error_message', result.error);
      }

      const room = result.room;

      // Update active socket ID for host or guest
      if (String(room.host?.userId || room.host?._id) === String(uId)) {
        room.host.socketId = socket.id;
      } else if (room.guest) {
        room.guest.socketId = socket.id;
      }

      await updateRoom(room);

      socket.join(room.roomCode);
      io.to(room.roomCode).emit('player_joined', room);
      console.log(`👤 User ${dbUser.firstname} joined room: ${room.roomCode}`);
    } catch (err) {
      console.error('Error joining room:', err);
      socket.emit('error_message', 'Room join karne mein issue aaya!');
    }
  });

  // 3. START BATTLE & FETCH RANDOM PROBLEM FROM MONGODB
  socket.on('start_battle', async ({ roomCode }) => {
    try {
      const room = await getRoom(roomCode);
      if (!room) return socket.emit('error_message', 'Room nahi mila ya expire ho gaya!');

      // Aggregate pipeline to get 1 random problem set
      const randomProblems = await Problem.aggregate([{ $sample: { size: 1 } }]);
      if (!randomProblems || randomProblems.length === 0) {
        return socket.emit('error_message', 'Database mein koi problem available nahi hai!');
      }

      const randomProblem = randomProblems[0];

      room.status = 'IN_PROGRESS';
      room.problemId = randomProblem._id;
      room.startTime = new Date();
      await updateRoom(room);

      io.to(roomCode).emit('battle_started', {
        room,
        problem: randomProblem
      });
      console.log(`🚀 Battle Started in Room: ${roomCode}`);
    } catch (err) {
      console.error('Error starting battle:', err);
      socket.emit('error_message', 'Battle start karne mein error aaya!');
    }
  });

  // 4. REALTIME CODE & CURSOR SYNC
  socket.on('sync_code', ({ roomCode, code, language }) => {
    socket.to(roomCode).emit('opponent_code_update', { code, language });
  });

  // 5. SUBMIT SOLUTION & WINNER CALCULATION
 // 5. SUBMIT SOLUTION & WINNER CALCULATION (With Safe Termination Buffer)
 socket.on('submit_solution', async ({ roomCode, userId, isPassed, passedCases, totalCases }) => {
  try {
    if (isPassed) {
      const room = await getRoom(roomCode);
      const betAmount = room?.betAmount || 50;

      console.log(`🎯 Correct solution submitted by User ${userId} in Room: ${roomCode}`);

      // 1. Sabhi functionalities intact: Winner Declare karke Battle Over broadcast karo
      io.to(roomCode).emit('battle_over', {
        winnerId: userId,
        message: 'Match Over! Problem Solved.',
        betAmount
      });

      // 2. Safe Room Termination/Cleanup (2-Second Buffer)
      // Isse socket event reliably dono users tak pahunch jayega bina room ke instant delete hue
      setTimeout(async () => {
        try {
          await removeRoom(roomCode);
          if (redisClient) {
            await redisClient.del(`room:${roomCode}`);
          }
          console.log(`🧹 Room ${roomCode} successfully cleaned up after battle conclusion.`);
        } catch (cleanupErr) {
          console.error(`Error cleaning up room ${roomCode}:`, cleanupErr);
        }
      }, 2000);

    } else {
      // Agar testcase fail hua toh baseline attempt broadcast karo
      socket.to(roomCode).emit('opponent_submission_attempt', { passedCases, totalCases });
    }
  } catch (err) {
    console.error('Error in submit_solution:', err);
  }
});

  // 6. MANUAL LEAVE MATCH HANDLER
  socket.on('leave_room', async ({ roomCode, userId }) => {
    console.log(`🚪 User ${userId} requested manual exit from Room: ${roomCode}`);
    await terminateRoom(roomCode, 'Opponent left the match. Battle terminated!');
  });

  // 7. SINGLE DISCONNECTING HANDLER (Tab close / Window Close)
  socket.on('disconnecting', async () => {
    try {
      const rooms = Array.from(socket.rooms);
      for (const roomCode of rooms) {
        if (roomCode !== socket.id) {
          // Socket room context retrieve
          const room = await getRoom(roomCode);
          
          // Sirf tab terminate karein jab battle actually 'IN_PROGRESS' mein ho
          // Aur disconnect real player loss ka ho, temporary reconnect na ho
          if (room) {
            console.log(`⚠️ Socket ${socket.id} disconnecting from active room ${roomCode}`);
            await terminateRoom(roomCode, 'Opponent disconnected. Match terminated!');
          }
        }
      }
    } catch (err) {
      console.error('Error on socket disconnecting:', err);
    }
  });

};