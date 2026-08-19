const cloudinary = require("cloudinary").v2;
const problem = require("../models/problem");
const user = require("../models/user");
const video = require("../models/editorial");
const { sanitizeFilter } = require("mongoose");

cloudinary.config({
    cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
    api_key : process.env.CLOUDINARY_API_KEY,
    api_secret : process.env.CLOUDINARY_API_SECRET
});

const createvideo = async (req,res) => {
    try{
        const {problemid} = req.params;
        const userid = req.user.id;
        const problem_find = await problem.findById(problemid);
        if(!problem_find){
            return res.status(404).json({message: "Problem not found"});
        }
        const timestamp = Math.round(new Date().getTime() / 1000);
        const publicid = `sankalcode_solutions/${problemid}/${userid}_${timestamp}`;

        const uploadparameters = {
            timestamp : timestamp,
            public_id : publicid,
        }

        const signature = cloudinary.utils.api_sign_request(
            uploadparameters,
            process.env.CLOUDINARY_API_SECRET
        );

        res.json({
            signature,
            timestamp,
            public_id: publicid,
            api_key: process.env.CLOUDINARY_API_KEY,
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            // uploadurl:`https://api.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`
           uploadurl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`
        })
    }
    catch(error){
        console.log(error);
        res.status(500).json({message: "Internal server error"});
    }
}

const savevideodata = async (req,res) => {
    try{

        const { problemid, cloudnaryid, secureurl, thumbnail, duration } = req.body;
        const userid = req.user.id;
         
        const cloudinaryresources = await cloudinary.api.resource(cloudnaryid , {resource_type: "video"});
        if(!cloudinaryresources){
            return res.status(404).json({message: "Video not found"});
        }

        const existingvideo = await video.findOne({cloudnaryid , problemid, userid});
        if(existingvideo){
            return res.status(400).json({message: "Video already exists"});
        }

        const thumbnailurl = cloudinary.url(cloudinaryresources.public_id , {
            resource_type: "image",
            format: "jpg",
            transformation:[
                { width: 400, height: 225, crop: 'fill' },
                { quality: 'auto' },
                { start_offset: 'auto' } 
            ],
          
        });

        const videosolution = new video({
            problemid,
            userid,
            cloudnaryid,
            secureurl,
            thumbnail: thumbnailurl,
            duration:cloudinaryresources.duration || duration
        })

        await videosolution.save();
        res.status(201).json({
            message: "Video saved successfully",
            video: videosolution
        })
    }
    catch(error){
        console.log(error);
        res.status(500).json({message: "Internal server error"});
    }
}
 
const deletevideo = async (req,res) => {
    try{
        const {problemid} = req.params;
        const userid = req.user.id;
        const video_find = await video.findByIdAndDelete({problemid: problemid, userid: userid});
        if(!video_find){
            return res.status(404).json({message: "Video not found"});
        }

        await cloudinary.uploader.destroy(video_find.cloudnaryid,{resource_type: "video" , invalidate:true});
        res.status(200).json({message: "Video deleted successfully"});
    }
    catch(error){
        console.log(error);
        res.status(500).json({message: "Internal server error"});
    }
}

module.exports = {
    createvideo,
    savevideodata,
    deletevideo
}