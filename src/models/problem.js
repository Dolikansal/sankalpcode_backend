const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const problemschema = new Schema({
    title:{
        type:String,
        required:true
    },
    description :{
        type:String,
        required:true
    },
    difficulty :{
        type:String,
        enum : ['Easy', 'Medium', 'Hard'],
        required:true
    },
    tags:{
        type:[String],
        required:true,
        enum :['Array', 'String', 'Linked List', 'Dynamic Programming', 'Graph', 'Tree', 'Hash Table', 'Math', 'Backtracking', 'Design', 'Sorting', 'Greedy', 'Bit Manipulation', 'Two Pointers', 'Divide and Conquer']
    },
    visibletestcase :[
        {
            input:{
                type:String,
                required:true
            },
            output:{
                type:String,
                required:true
            },
            explanation:{
                type:String,
                required:true
            }
        }
    ],
    hiddentestcase :[
        {
            input:{
                type:String,
                required:true
            },
            output:{
                type:String,
                required:true
            }
        }
    ],

    startcode :[
        {
            language:{
                type:String,
                required:true,
            },
            initialcode:{
                type:String,
                required:true
            }
        }
    ],

    referencesolution :[
        {
            language:{
                type:String,
                required:true,
            },
            completecode:{
                type:String,
                required:true
            }
        }
    ],

    problemcreator :{
        type: Schema.Types.ObjectId,
        required:false,
        ref:"user"
    }
})

const problem = mongoose.model('problem',problemschema);
module.exports = problem;

