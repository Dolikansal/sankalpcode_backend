const validator = require('validator');
const validate =(data)=> {
    const mandetoryFields = ['firstname', 'email', 'password'];
    const isallow = mandetoryFields.every((k)=>Object.keys(data).includes(k));

    if(!isallow){
        throw new Error('All fields are required');
    }

    if(!validator.isEmail(data.email)){
        throw new Error('Invalid email address');
    }

    if(!validator.isStrongPassword(data.password)){
        throw new Error('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one symbol');
    }
}

module.exports = validate;