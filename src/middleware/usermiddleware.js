const jwt = require('jsonwebtoken');
const user = require('../models/user');
const redisClient = require('../config/redis');
const usermiddleware = async(req, res, next) => {

 try{
    const {token} = req.cookies;

    if(!token){
        return res.status(401).json({ message: "No token, authorization denied" });
    }

    const payload = jwt.verify(token , process.env.JWT_KEY);

    const {id} = payload;

    if (!id) {
        return res.status(401).json({ message: "Unauthorized id" });
    }

     const result = await user.findById(id);

     if (!result) {
        return res.status(401).json({ message: "User not exists" });
    }

     const isblocked = await redisClient.exists(`blocked:${id}`);
     if(isblocked){
        throw new error ("user is blocked");
     }

     req.result = result;

     next(); 
 }
 catch(err){
        console.log("Middleware Error:", err.message);
        res.status(401).json({ message: "Invalid Token" });
 }
}


module.exports = usermiddleware;