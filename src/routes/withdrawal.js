const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/adminAuth');
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');

// Create withdrawal request
router.post('/request', authMiddleware, async (req, res) => {
    try {
        const { amount, currency, withdrawalAddress } = req.body;

        if (!amount || !currency || !withdrawalAddress) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Get user and check balance
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const currencyUpper = currency.toUpperCase();
        const networkFee = currencyUpper === 'BTC' ? 0.00011 : 0; // BTC network fee
        const totalAmount = Number(amount) + networkFee;

        // Check if user has enough balance
        if (user.wallet.assetBalance[currencyUpper] < totalAmount) {
            return res.status(400).json({ 
                error: 'Insufficient balance',
                required: totalAmount,
                available: user.wallet.assetBalance[currencyUpper]
            });
        }

        // Create withdrawal request
        const withdrawal = new Withdrawal({
            user: req.userId,
            amount: Number(amount),
            currency: currencyUpper,
            withdrawalAddress,
            networkFee
        });

        // Reserve the amount by reducing available balance
        user.wallet.assetBalance[currencyUpper] -= totalAmount;
        await user.save();
        await withdrawal.save();

        res.status(201).json({
            message: 'Withdrawal request submitted successfully',
            withdrawal: {
                id: withdrawal._id,
                amount,
                networkFee,
                totalAmount,
                currency,
                status: withdrawal.status,
                withdrawalAddress,
                createdAt: withdrawal.createdAt
            }
        });
    } catch (error) {
        console.error('Create withdrawal error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user's withdrawals
router.get('/my-withdrawals', authMiddleware, async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find({ user: req.userId })
            .sort({ createdAt: -1 });

        res.json(withdrawals);
    } catch (error) {
        console.error('Get withdrawals error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin: Get all pending withdrawals
router.get('/pending', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find({ status: 'pending' })
            .populate('user', 'email firstName lastName')
            .sort({ createdAt: -1 });

        res.json(withdrawals);
    } catch (error) {
        console.error('Get pending withdrawals error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin: Process withdrawal (approve/reject)
router.put('/:withdrawalId/process', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { status, reason } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const withdrawal = await Withdrawal.findById(req.params.withdrawalId);
        if (!withdrawal) {
            return res.status(404).json({ error: 'Withdrawal not found' });
        }

        if (withdrawal.status !== 'pending') {
            return res.status(400).json({ error: 'Withdrawal already processed' });
        }

        const user = await User.findById(withdrawal.user);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        withdrawal.status = status;
        withdrawal.approvedAt = Date.now();
        withdrawal.approvedBy = req.userId;
        withdrawal.reason = reason;

        if (status === 'approved') {
            // Update total balance
            user.wallet.totalBalance[withdrawal.currency] -= (withdrawal.amount + withdrawal.networkFee);
        } else {
            // If rejected, return the reserved amount to available balance
            user.wallet.assetBalance[withdrawal.currency] += (withdrawal.amount + withdrawal.networkFee);
        }

        await user.save();
        await withdrawal.save();

        res.json({
            message: `Withdrawal ${status} successfully`,
            withdrawal
        });
    } catch (error) {
        console.error('Process withdrawal error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router; 