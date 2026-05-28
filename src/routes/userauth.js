const express = require('express');
const router = express.Router();
const {register , login , logout , adminregister ,deleteprofile , getprofile , updateprofile} = require("../controllers/userauthcontroller");
const usermiddleware = require("../middleware/usermiddleware");
const adminmiddleware = require("../middleware/adminmiddleware");

// register
router.post("/register", register);
// login
router.post("/login", login);
// logout
router.post("/logout",usermiddleware, logout);
// getprofile
// router.get("/getprofile", getprofile);
// admin register
router.post("/admin/register",adminmiddleware ,adminregister);
router.delete("deleteprofile" , usermiddleware , deleteprofile);
router.get("/getprofile" , usermiddleware , getprofile);
router.put("/getprofile/update" , usermiddleware , updateprofile);

router.get("/check" , usermiddleware , (req ,res)=>{
    const reply = {
        firstname : req.result.firstname,
        email : req.result.email,
        _id : req.result._id,
        role: req.result.role
    }

    res.status(201).json({
        success : true,
        message : "user is authenticated",
        user : reply
    })
})

module.exports = router;