const express = require('express');
const adminmiddleware = require('../middleware/adminmiddleware');
const videorouter = express.Router();
const {createvideo,savevideodata,deletevideo} = require("../controllers/videocontroller")

videorouter.get("/create/:problemid",adminmiddleware, createvideo);
videorouter.post("/save",adminmiddleware, savevideodata);
videorouter.delete("/delete/:problemid",adminmiddleware,deletevideo);


module.exports = videorouter;