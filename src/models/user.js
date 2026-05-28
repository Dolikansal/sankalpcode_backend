const mongoose = require('mongoose');
const {Schema} = mongoose;
 
const userschema = new Schema({
    firstname : {
        type : String,
        required : true,
        minLength : 3,
        maxLength : 20,
    },
     lastname:{
        type : String,
        minLength : 3,
        maxLength : 20,
     },
     email :{
        type : String,
        required : true,
        unique : true,
        trime: true,
        lowercase : true,
        immutable : true,
     },
     age:{
        type : Number,
        min : 10,
        max:70,
     },
     role:{
        type : String,
        enum : ['admin','user'],
        default : 'user',
     },
     problemsolved:{
        type : [{
         type : Schema.Types.ObjectId,
         ref : 'problem',
         default: []
        }],
     },
     password:{
         type : String,
         required : true,
     },
     location: { type: String, default: "" },
    systemObjective: { type: String, default: "" },
    education: { type: String, default: "" },
    skills: { type: [String], default: [] },
    achievements: { type: [String], default: [] }
}
,{
    timestamps : true,
 })
 userschema.post('findOneAndDelete', async function(doc) {
   if (doc) {
     // Jab user delete ho, uske saare submissions uda do
     await mongoose.model('Submission').deleteMany({ userid: doc._id });
   }
 });

 const user = mongoose.model('user', userschema);
module.exports = user;