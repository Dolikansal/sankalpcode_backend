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
const cors = require('cors');

app.use(cors({
    origin : 'http://localhost:5173',
    credentials : true
}))
app.use(express.json());
app.use(cookieparser());
app.use("/user" , router);
app.use("/problem" , problemroute);
app.use("/submission" , submitrouter);
app.use('/api/hints', hintRoutes);
app.use('/api/quiz', quizroute);
app.use("/api/instructor", instructorRouter);


// const initializeredis = async () =>{
//     try{
//         await Promise.all([main() , redisclient.connect()]);
//         console.log('Connected to database and redis successfully');

//         app.listen(process.env.PORT || 3001 , ()=>{
//            console.log('Server is running on port 3001');
//         })
//     }
//     catch(err){
//         console.log('Error initializing redis', err);
//     }
// }

const initializeredis = async () => {
    try {
        // Connect to Database first
        await main();
        console.log('✅ Connected to MongoDB successfully');

        // Start the server immediately after DB is ready
        app.listen(process.env.PORT || 3001, () => {
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

// main()
// .then(()=>{
//     app.listen(process.env.PORT || 3001 , ()=>{
//         console.log('Server is running on port 3001');
//     })
// })
// .catch ( err => {
//     console.log('Error connecting to database', err);
// })

// const express = require('express');
// require('dotenv').config();
// const app = express();
// const main = require('./config/db');
// const cookieparser = require('cookie-parser');
// const router = require("./routes/userauth");
// const redisclient = require('./config/redis');
// const problemroute = require("./routes/problemcreate");

// app.use(express.json());
// app.use(cookieparser());
// app.use("/user", router);
// app.use("/problem", problemroute);

// const startServer = async () => {
//     try {
//         // 1. Pehle Database connect karo (Ye zaroori hai)
//         await main();
//         console.log('✅ Connected to MongoDB successfully');

//         // 2. Redis ko alag se try karo taaki server na ruke
//         try {
//             // Check if not already connected (prevents 'Socket already opened' error)
//             if (!redisclient.isOpen) {
//                 await redisclient.connect();
//                 console.log('✅ Connected to Redis successfully');
//             }
//         } catch (redisErr) {
//             console.log('⚠️ Redis skip ho gaya (Connection Error), but server chalega.');
//         }

//         // 3. Server ko hamesha start karo, chahe Redis chale ya na chale
//         const PORT = process.env.PORT || 3001;
//         app.listen(PORT, () => {
//             console.log(`🚀 Server is running on port ${PORT}`);
//         });

//     } catch (err) {
//         console.error('❌ Server start nahi ho paya:', err);
//     }
// };

// startServer();