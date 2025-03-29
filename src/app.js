const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Set strictQuery to false to prepare for Mongoose 7
mongoose.set('strictQuery', false);

// Update CORS configuration to allow port 4173
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173'], // Added 4173
    credentials: true, // Allow credentials
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
}));

// Middleware
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/user', require('./routes/user'));
app.use('/api/deposit', require('./routes/deposit'));
app.use('/api/withdrawal', require('./routes/withdrawal'));
app.use('/api/cryptocurrencies', require('./routes/cryptocurrency'));

// Connect to MongoDB with updated options
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 