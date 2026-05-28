const redisclient = require('../config/redis');
const user = require('../models/user');
const validate = require("../utils/validator")
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const submission = require('../models/submission');
// register
const register = async (req, res) =>{
    try{
        validate(req.body);
        const {firstname , email , password} = req.body; 
        const existingUser = await user.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        
        const hashedPassword= await bcrypt.hash(password, 10);
        req.body.password = hashedPassword;
        req.body.role = "user";
        // const newuser = await user.create(req.body);
        const newuser = await user.create({
            firstname,
            email,
            password: hashedPassword,
            role: "user",
            problemsolved: [] // Forcefully ise empty array set kar do signup pe
        });
        const token = jwt.sign({id:newuser._id , email:email , role : "user"} , process.env.JWT_KEY , {expiresIn : '1h'});
        const reply = {
            firstname : newuser.firstname,
            email : newuser.email,
            _id : newuser._id,
            role : newuser.role,
        }
        res.cookie('token' , token , {maxAge : 3600000});
        res.status(201).json({
            user:reply,
            message : "user registered sucessfully",
        }) 

    }
    catch(err){
        console.log("DB Error:", err.message);
        res.status(500).json({
            success : false,
            message : "Error registering user",
            error : err.message,
        })
    }
}

// login
const login = async (req, res) =>{
    try{
        const {email , password} = req.body;
        if(!email){
            throw new Error("Email is required");
        }

        if(!password){
            throw new Error("Password is required");
        }

        const newuser = await user.findOne({email : email});

        const match = bcrypt.compare(password ,newuser.password);
        if(!match){
            throw new Error("Invalid credentials");
        }

        const reply = {
            firstname : newuser.firstname,
            email : newuser.email,
            _id : newuser._id,
            role : newuser.role,
        }
        const token = jwt.sign({id:newuser.id , email:email , role :newuser.role} , process.env.JWT_KEY , {expiresIn : '1h'});
        res.cookie('token' , token , {maxAge : 3600000});

        res.status(200).json({
            user:reply,
            message : "user logged in successfully",
        })
    }
    catch(err){
        res.status(500).json({
            success : false,
            message : "Error logging in user",
            error : err.message,
        })
    }
}

//logout
const logout = async (req , res) =>{
    try{

        const {token} = req.cookies;

        const payload = jwt.decode(token);
        await redisclient.set(`token : ${token}`  , 'blocked' )
        await redisclient.expireAt(`token : ${token} `,  payload.exp);

        res.cookie("token" , null , {expires:new Date(Date.now())});

        res.send("user logged out successfully");
    }
    catch(err){
        res.status(500).json({
            success : false,
            message : "Error logging out user",
            error : err.message,
        })
    }
}

// admin register
const adminregister = async(req , res) => {
    try{
        validate(req.body);
        const {firstname , email , password} = req.body; 
        
        req.body.password = await bcrypt.hash(password, 10);
        const newuser = await user.create(req.body);
        const token = jwt.sign({id:newuser.id , email:email , role : newuser.role} , process.env.JWT_KEY , {expiresIn : '1h'});
        res.cookie('token' , token , {maxAge : 3600000});
        res.status(201).send("admin registered sucessfully"); 

    }
    catch(err){
        res.status(500).json({
            success : false,
            message : "Error registering admin",
            error : err.message,
        })
    }
}

const deleteprofile = async(req , res) =>{
    try{
        const userid = req.result._id;
        await user.findByIdAndDelete(userid);
        // await submission.deleteMany({userid : userid}); 

        res.status(200).send("profile deleted successfully");
    }
    catch(err){
        res.status(500).json({
            success : false,
            message : "Error deleting profile",
            error : err.message,
        })
    }
}

const getprofile = async (req, res) => {
    try {
        const userid = req.result ? req.result._id : req.user.id;
        
        const currentuser = await user.findById(userid).select("-password");
        if (!currentuser) {
            return res.status(404).json({ message: "User matrix not found in database node." });
        }

        res.status(200).json({
            name: currentuser.firstname,
            email: currentuser.email,
            role: currentuser.role,
            location: currentuser.location || "Not Configured",
            systemObjective: currentuser.systemObjective || "",
            skills: currentuser.skills || [],
            problemsolved: currentuser.problemsolved || [],
            education: currentuser.education || "Not Specified",
            achievements: currentuser.achievements || []
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

const updateprofile = async (req, res) => {
    try {
        const userid = req.result ? req.result._id : req.user.id;
        const { location, systemObjective, skills, education, achievements } = req.body;

        const updateduser = await user.findByIdAndUpdate(
            userid,
            {
                $set: {
                    location,
                    systemObjective,
                    skills, // Array expected from client
                    education,
                    achievements // Array expected from client
                }
            },
            { new: true, runValidators: true }
        ).select("-password");

        res.status(200).json({
            message: "Database index updated successfully",
            user: updateduser
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


module.exports = {register, login, logout , adminregister , deleteprofile , getprofile , updateprofile};