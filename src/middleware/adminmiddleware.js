// const jwt = require('jsonwebtoken');
// const user = require('../models/user'); 

// const adminmiddleware = async(req, res, next) => {

//  try{
//     const {token} = req.cookies;

//     if(!token){
//         throw new error ("Unauthorized");
//     }

//     const payload = jwt.verify(token , process.env.JWT_KEY);

//     const {id} = payload;

//     if(!id){
//         throw new error ("Unauthorized id");
//     }

//      const result = await user.findById(id);

//      if(payload.role !== "admin") {
//         throw new error ("Unauthorized role for admin");
//      }

//      if(!result){
//         throw new error ("user not exists");
//      }

//      const isblocked = await redisClient.exists(`blocked:${id}`);
//      if(isblocked){
//         throw new error ("user is blocked");
//      }

//      req.result = result;

//      next(); 
//  }
//  catch(err){
//         console.log(err);
//         res.status(500).json({message: err.message});
//  }
// }


// module.exports = adminmiddleware;

const jwt = require('jsonwebtoken');
const user = require('../models/user'); 
// const redisclient = require('../config/redis'); // Agar error de raha hai toh abhi comment rehne do

const adminmiddleware = async(req, res, next) => {
 try {
    // Check both: Cookie or Authorization Header
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

    console.log("🔍 Debug - Token Received:", token ? "Yes (Hidden for safety)" : "No");

    if (!token) {
        throw new Error("Unauthorized: No token provided");
    }

    const payload = jwt.verify(token, process.env.JWT_KEY);
    const { id } = payload;

    if (!id) {
        throw new Error("Unauthorized: Invalid ID");
    }

    const result = await user.findById(id);

    if (payload.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
    }

    if (!result) {
        throw new Error("User does not exist");
    }

    // Redis check ko safely handle karo
    /*
    if (redisclient && redisclient.isOpen) {
        const isblocked = await redisclient.exists(`blocked:${id}`);
        if (isblocked) throw new Error("User is blocked");
    }
    */

    req.user = result;
    next(); 
 }
 catch (err) {
    console.log("❌ Middleware Error:", err.message);
    res.status(401).json({ message: err.message });
 }
}

module.exports = adminmiddleware;