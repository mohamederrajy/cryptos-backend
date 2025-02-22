const mongoose = require('mongoose');
const User = require('../models/User');

async function updateUserStatus() {
    try {
        await User.updateMany(
            { status: { $exists: false } },
            { $set: { status: 'active' } }
        );
        console.log('Updated user status successfully');
    } catch (error) {
        console.error('Migration error:', error);
    }
}

updateUserStatus(); 