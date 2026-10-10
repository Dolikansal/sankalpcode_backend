const express = require('express');
require('dotenv').config();
const app = express();
const main = require('./config/db');
const cookieparser = require('cookie-parser');
const router = require("./routes/userauth");
const redisclient = require('./config/redis');
const problemroute = require("./routes/problemcreate");
const submitrouter = require("./routes/submit");
const hintRoutes = require('./routes/hintRoutes');
const quizroute = require('./routes/quizRoutes');
const instructorRouter = require('./routes/instructorRoute');
const videorouter = require("./routes/video");
const cors = require('cors');
const http = require('http'); // Node.js built-in HTTP module
const { Server } = require('socket.io');
const registerBattleHandlers = require('../src/socket/battlesocket');

app.use(cors({
    origin: [
        "https://sankalpcode-frontend-silk.vercel.app", // aapka live vercel link
        "http://localhost:5173"                         // local testing ke liye
    ],
    credentials : true
}))
app.use(express.json());
app.use(cookieparser());

app.get("/", (req, res) => {
    res.status(200).json({
        message: "SankalpCode Backend is running live! 🚀"
    });
});
app.use("/user" , router);
app.use("/problem" , problemroute);
app.use("/submission" , submitrouter);
app.use('/api/hints', hintRoutes);
app.use('/api/quiz', quizroute);
app.use("/api/instructor", instructorRouter);
app.use("/video" ,videorouter);
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: [
            "https://sankalpcode-frontend-silk.vercel.app", // aapka live vercel link
            "http://localhost:5173"                         // local testing ke liye
        ], // Jo bhi available ho sabko allow kar dega
      methods: ["GET", "POST"],
      credentials: true
    }
});
  io.on('connection', (socket) => {
    console.log(`⚡ Socket Connected: ${socket.id}`);
  
    // Gamification 1v1 Battle socket events register karo
    registerBattleHandlers(io, socket);
  
    socket.on('disconnect', () => {
      console.log(`❌ Socket Disconnected: ${socket.id}`);
    });
  });

const initializeredis = async () => {
    try {
        // Connect to Database first
        await main();
        console.log('✅ Connected to MongoDB successfully');

        // Start the server immediately after DB is ready
        server.listen(process.env.PORT || 3001, () => {
            console.log('🚀 Server is running on port 3001');
        });

        // Attempt Redis connection separately so it doesn't crash the server
        redisclient.connect()
        .then(async () => {
            console.log('✅ Connected to Redis successfully');
            
            // --- YE LINE ADD KARO PURANA CACHE DELETE KARNE KE LIYE ---
            await redisclient.flushAll(); 
            console.log('🧹 Redis Cache Cleared (Purane adhure hints delete ho gaye!)');
            // ---------------------------------------------------------
        })
            .catch(err => console.error('❌ Redis Connection Failed:', err.message));

    } catch (err) {
        console.error('💥 Critical Error: Could not start server', err);
        process.exit(1); // Stop if DB fails
    }
}

initializeredis();

