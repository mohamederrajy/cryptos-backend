require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const bcrypt = require('bcryptjs');

async function createFirstAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            tls: true,
            tlsAllowInvalidCertificates: true
        });

        const adminEmail = 'admin@cryptoso.com';
        const adminPassword = 'Admin123!@#';

        const existingAdmin = await User.findOne({ email: adminEmail });
        console.log('Existing admin:', existingAdmin);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        const admin = new User({
            email: adminEmail,
            password: hashedPassword,
            role: 'admin',
            firstName: 'Admin',
            lastName: 'User'
        });

        await admin.save();
        console.log('Admin created:', admin);
        console.log('Admin user created successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
}

createFirstAdmin(); 