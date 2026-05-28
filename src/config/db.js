const mongoose = require('mongoose');

async function main(){
    mongoose.connect(process.env.MONGO_URI);
}

module.exports = main;