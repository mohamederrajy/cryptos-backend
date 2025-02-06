const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    profileImage: {
        type: String,
        default: null  // Default is no image
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        required: true
    },
    wallet: {
        totalBalance: {
            btc: { type: Number, default: 0 },
            usd: { type: Number, default: 0 }
        },
        assetBalance: {
            btc: { type: Number, default: 0 },
            usd: { type: Number, default: 0 }
        },
        exchangeBalance: {
            btc: { type: Number, default: 0 },
            usd: { type: Number, default: 0 }
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema); 