const mongoose = require('mongoose');
const { Schema } = mongoose;
const battleSchema = new Schema({
    roomCode: { type: String, required: true },
    host: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    guest: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    problem: { type: Schema.Types.ObjectId, ref: 'problem', required: true },
    betAmount: { type: Number, required: true },
    winner: { type: Schema.Types.ObjectId, ref: 'user', default: null },
    status: {
        type: String,
        enum: ['IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'DRAW'],
        default: 'IN_PROGRESS'
    },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('battle', battleSchema);