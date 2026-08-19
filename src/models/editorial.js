const mongoose = require('mongoose');
const problem = require('./problem');
const {Schema} = mongoose;
const editorialschema = new Schema({
    problemid:{
        type: Schema.Types.ObjectId,
        required:true,
        ref:"problem"
    },
    userid:{
        type: Schema.Types.ObjectId,
        required:true,
        ref:"user"
    },
    cloudnaryid:{
        type:String,
        required:true,
    },
    secureurl:{
        type:String,
        required:true,
    },
    thumbnail:{
        type:String,
        required:true
    },
    duration:{
        type:Number,
        required:true
    }
}, {
    timestamps: true
});

const video = mongoose.model('video',editorialschema);
module.exports = video;