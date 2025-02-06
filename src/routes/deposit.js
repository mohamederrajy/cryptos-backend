const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/adminAuth');
const Deposit = require('../models/Deposit');
const User = require('../models/User');

// Create new deposit request
router.post('/manual', authMiddleware, async (req, res) => {
    try {
        const { amount, currency } = req.body;

        if (!amount || !currency) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Generate a unique deposit address (in real system, this would be a real blockchain address)
        const depositAddress = 'bc1' + Date.now().toString(36) + Math.random().toString(36).substr(2);
        
        // Generate a temporary txHash (in real system, user would provide the actual transaction hash)
        const txHash = 'tx' + Date.now().toString(36) + Math.random().toString(36).substr(2);

        const deposit = new Deposit({
            user: req.userId,
            amount,
            currency: currency.toLowerCase(),
            txHash,
            depositAddress
        });

        await deposit.save();

        res.status(201).json({
            message: 'Deposit request submitted successfully',
            deposit: {
                id: deposit._id,
                amount,
                currency,
                status: deposit.status,
                depositAddress,
                instructions: `Please send ${amount} ${currency.toUpperCase()} to the following address: ${depositAddress}`,
                createdAt: deposit.createdAt
            }
        });
    } catch (error) {
        console.error('Create deposit error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user's deposits
router.get('/my-deposits', authMiddleware, async (req, res) => {
    try {
        const deposits = await Deposit.find({ user: req.userId })
            .sort({ createdAt: -1 });

        res.json(deposits);
    } catch (error) {
        console.error('Get deposits error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin: Get all pending deposits
router.get('/pending', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const deposits = await Deposit.find({ status: 'pending' })
            .populate('user', 'email firstName lastName')
            .sort({ createdAt: -1 });

        res.json(deposits);
    } catch (error) {
        console.error('Get pending deposits error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin: Approve or reject deposit
router.put('/:depositId/process', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const deposit = await Deposit.findById(req.params.depositId);
        if (!deposit) {
            return res.status(404).json({ error: 'Deposit not found' });
        }

        if (deposit.status !== 'pending') {
            return res.status(400).json({ error: 'Deposit already processed' });
        }

        deposit.status = status;
        deposit.approvedAt = Date.now();
        deposit.approvedBy = req.userId;

        // If approved, update user's wallet balance
        if (status === 'approved') {
            const user = await User.findById(deposit.user);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Update total and asset balance
            user.wallet.totalBalance[deposit.currency] += deposit.amount;
            user.wallet.assetBalance[deposit.currency] += deposit.amount;
            
            await user.save();
        }

        await deposit.save();

        res.json({
            message: `Deposit ${status} successfully`,
            deposit
        });
    } catch (error) {
        console.error('Process deposit error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router; 