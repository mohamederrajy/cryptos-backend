const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

router.post('/signup', [
    // Validation middleware
    body('firstName')
        .notEmpty()
        .trim()
        .withMessage('First name is required'),
    body('lastName')
        .notEmpty()
        .trim()
        .withMessage('Last name is required'),
    body('email').isEmail().normalizeEmail(),
    body('password')
        .isLength({ min: 8 })
        .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Password confirmation does not match password');
        }
        return true;
    })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { firstName, lastName, email, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const user = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword
        });

        await user.save();

        res.status(201).json({
            message: 'User created successfully',
            userId: user._id,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login route
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').exists()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Generate refresh token
        const refreshToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            refreshToken,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                status: user.status,
                isAdmin: user.role === 'admin',
                wallet: {
                    totalBalance: {
                        USDT: user.wallet.totalBalance.USDT || 0
                    },
                    assetBalance: {
                        USDT: user.wallet.assetBalance.USDT || 0
                    },
                    exchangeBalance: {
                        USDT: user.wallet.exchangeBalance.USDT || 0
                    }
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user profile
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            profile: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                status: user.status,
                isAdmin: user.role === 'admin',
                createdAt: user.createdAt,
                wallet: {
                    totalBalance: {
                        USDT: user.wallet.totalBalance.USDT || 0
                    },
                    assetBalance: {
                        USDT: user.wallet.assetBalance.USDT || 0
                    },
                    exchangeBalance: {
                        USDT: user.wallet.exchangeBalance.USDT || 0
                    }
                }
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Refresh token route
router.post('/refresh-token', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        // Verify existing token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find user
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate new token
        const newToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token: newToken,
            user: {
                id: user._id,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Update user profile
router.put('/update-profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update fields if provided
        const { firstName, lastName, email } = req.body;
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (email) {
            // Check if email is already taken
            const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
            if (existingUser) {
                return res.status(400).json({ error: 'Email already in use' });
            }
            user.email = email;
        }

        await user.save();

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                status: user.status,
                isAdmin: user.role === 'admin',
                wallet: {
                    totalBalance: {
                        USDT: user.wallet.totalBalance.USDT || 0
                    },
                    assetBalance: {
                        USDT: user.wallet.assetBalance.USDT || 0
                    },
                    exchangeBalance: {
                        USDT: user.wallet.exchangeBalance.USDT || 0
                    }
                }
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router; 