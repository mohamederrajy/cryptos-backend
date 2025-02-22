const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/adminAuth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Deposit = require('../models/Deposit');
const Withdrawal = require('../models/Withdrawal');

// Get all users (admin only)
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        console.log('Admin ID:', req.userId);
        const users = await User.find({});  // Get all users without any filtering
        console.log('Found users:', users);
        console.log('Total users found:', users.length);
        console.log('Database connection status:', mongoose.connection.readyState);
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get specific user (admin only)
router.get('/users/:userId', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update user (admin only)
router.put('/users/:userId', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { email, role, wallet } = req.body;
        
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update fields if provided
        if (email) user.email = email;
        if (role) user.role = role;
        if (wallet) user.wallet = wallet;

        await user.save();
        res.json({ message: 'User updated successfully', user });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete user (admin only)
router.delete('/users/:userId', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create admin user
router.post('/create-admin', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const admin = new User({
            email,
            password: hashedPassword,
            role: 'admin'
        });

        await admin.save();

        res.status(201).json({
            message: 'Admin user created successfully',
            adminId: admin._id
        });
    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user statistics (admin only)
router.get('/statistics', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        // Get total users count
        const totalUsers = await User.countDocuments();
        
        // Get total admins count
        const totalAdmins = await User.countDocuments({ role: 'admin' });

        // Get total USDT balance across all users
        const users = await User.find();
        const totalUSDTBalance = users.reduce((total, user) => {
            return total + (user.wallet.totalBalance.USDT || 0);
        }, 0);

        // Get pending deposits count and total amount
        const pendingDeposits = await Deposit.find({ status: 'pending' });
        const totalPendingDepositsAmount = pendingDeposits.reduce((total, deposit) => {
            return total + deposit.amount;
        }, 0);

        // Get pending withdrawals count and total amount
        const pendingWithdrawals = await Withdrawal.find({ status: 'pending' });
        const totalPendingWithdrawalsAmount = pendingWithdrawals.reduce((total, withdrawal) => {
            return total + withdrawal.amount;
        }, 0);

        // Get total completed deposits
        const completedDeposits = await Deposit.find({ status: 'approved' });
        const totalCompletedDepositsAmount = completedDeposits.reduce((total, deposit) => {
            return total + deposit.amount;
        }, 0);

        // Get total completed withdrawals
        const completedWithdrawals = await Withdrawal.find({ status: 'approved' });
        const totalCompletedWithdrawalsAmount = completedWithdrawals.reduce((total, withdrawal) => {
            return total + withdrawal.amount;
        }, 0);

        res.json({
            users: {
                total: totalUsers,
                admins: totalAdmins,
                regularUsers: totalUsers - totalAdmins
            },
            balance: {
                totalUSDT: totalUSDTBalance
            },
            pendingTransactions: {
                deposits: {
                    count: pendingDeposits.length,
                    totalAmount: totalPendingDepositsAmount
                },
                withdrawals: {
                    count: pendingWithdrawals.length,
                    totalAmount: totalPendingWithdrawalsAmount
                }
            },
            completedTransactions: {
                deposits: {
                    count: completedDeposits.length,
                    totalAmount: totalCompletedDepositsAmount
                },
                withdrawals: {
                    count: completedWithdrawals.length,
                    totalAmount: totalCompletedWithdrawalsAmount
                }
            }
        });
    } catch (error) {
        console.error('Statistics error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add this new test route
router.get('/test', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        // Create a test user
        const testUser = new User({
            firstName: 'Test',
            lastName: 'User',
            email: 'test@test.com',
            password: 'hashedpassword',
            role: 'user'
        });
        await testUser.save();
        
        // Get all users immediately after creating
        const users = await User.find({});
        
        res.json({
            message: 'Test successful',
            testUser,
            allUsers: users
        });
    } catch (error) {
        console.error('Test error:', error);
        res.status(500).json({ error: 'Test failed' });
    }
});

// Delete all pending deposits
router.delete('/pending-deposits', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const result = await Deposit.deleteMany({ status: 'pending' });
        
        res.json({
            message: 'All pending deposits deleted successfully',
            count: result.deletedCount
        });
    } catch (error) {
        console.error('Delete pending deposits error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete all pending withdrawals
router.delete('/pending-withdrawals', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const result = await Withdrawal.deleteMany({ status: 'pending' });
        
        res.json({
            message: 'All pending withdrawals deleted successfully',
            count: result.deletedCount
        });
    } catch (error) {
        console.error('Delete pending withdrawals error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router; 