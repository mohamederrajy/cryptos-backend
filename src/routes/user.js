const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

// Configure multer for image upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/profiles';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
});

// Update user profile
router.put('/profile', 
    authMiddleware, 
    upload.single('profileImage'),
    [
        body('firstName').optional().trim().notEmpty(),
        body('lastName').optional().trim().notEmpty(),
        body('email').optional().isEmail().normalizeEmail()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const user = await User.findById(req.userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Update basic info if provided
            if (req.body.firstName) user.firstName = req.body.firstName;
            if (req.body.lastName) user.lastName = req.body.lastName;
            if (req.body.email) {
                // Check if email is already taken by another user
                const existingUser = await User.findOne({ 
                    email: req.body.email,
                    _id: { $ne: req.userId }
                });
                if (existingUser) {
                    return res.status(400).json({ error: 'Email already in use' });
                }
                user.email = req.body.email;
            }

            // Update profile image if provided
            if (req.file) {
                // Delete old profile image if exists
                if (user.profileImage) {
                    const oldImagePath = path.join(__dirname, '../../', user.profileImage);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                }
                user.profileImage = req.file.path;
            }

            await user.save();

            res.json({
                message: 'Profile updated successfully',
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    profileImage: user.profileImage
                }
            });

        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
);

module.exports = router; 