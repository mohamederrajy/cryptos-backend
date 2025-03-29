const mongoose = require('mongoose');

const cryptocurrencySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    symbol: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    logo: {
        type: String,
        required: true  // URL to logo image
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    change24h: {
        type: Number,
        required: true,
        default: 0
    },
    marketCap: {
        type: Number,
        required: true,
        min: 0
    },
    volume24h: {
        type: Number,
        required: true,
        min: 0
    },
    volumeChange24h: {
        type: Number,
        required: true,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Cryptocurrency', cryptocurrencySchema); 