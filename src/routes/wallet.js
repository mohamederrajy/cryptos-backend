const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

// Get wallet info
router.get('/balance', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user.wallet);
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Deposit funds
router.post('/deposit', authMiddleware, async (req, res) => {
    try {
        const { amount, currency } = req.body;
        
        if (!amount || !currency) {
            return res.status(400).json({ error: 'Amount and currency are required' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update balances
        user.wallet.totalBalance[currency.toLowerCase()] += Number(amount);
        user.wallet.assetBalance[currency.toLowerCase()] += Number(amount);
        
        await user.save();

        res.json({
            message: 'Deposit successful',
            wallet: user.wallet
        });
    } catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Withdraw funds
router.post('/withdraw', authMiddleware, async (req, res) => {
    try {
        const { amount, currency } = req.body;
        
        if (!amount || !currency) {
            return res.status(400).json({ error: 'Amount and currency are required' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const currencyLower = currency.toLowerCase();
        
        // Check if user has enough balance
        if (user.wallet.assetBalance[currencyLower] < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Update balances
        user.wallet.totalBalance[currencyLower] -= Number(amount);
        user.wallet.assetBalance[currencyLower] -= Number(amount);
        
        await user.save();

        res.json({
            message: 'Withdrawal successful',
            wallet: user.wallet
        });
    } catch (error) {
        console.error('Withdrawal error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router; 