// const { createClient } = require("redis");

// const redisclient = createClient({
//     username: 'default',
//     password: process.env.REDIS_KEY,
//     socket: {
//         host: 'redis-16523.c85.us-east-1-2.ec2.cloud.redislabs.com',
//         port: 16523
//     }
// });

// module.exports = redisclient;

const { createClient } = require("redis");

const redisclient = createClient({
    password: process.env.REDIS_KEY,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        // Ye line add karne se agar connection fail hua toh server crash nahi hoga
        reconnectStrategy: (retries) => {
            if (retries > 3) {
                console.error("Redis reconnection failed. Continuing without Redis...");
                return false; // Reconnect karna band kar do
            }
            return Math.min(retries * 100, 3000);
        }
    }
});

// Error listener zaroori hai taaki server crash na ho
redisclient.on('error', (err) => {
    console.error('Redis Client Error:', err.message);
});

module.exports = redisclient;