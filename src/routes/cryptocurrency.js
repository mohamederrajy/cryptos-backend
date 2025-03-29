const express = require('express');
const router = express.Router();
const Cryptocurrency = require('../models/Cryptocurrency');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/adminAuth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for logo upload
const storage = multer.diskStorage({
    destination: './uploads/logos',
    filename: function(req, file, cb) {
        cb(null, 'logo-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 }, // 1MB limit
    fileFilter: function(req, file, cb) {
        checkFileType(file, cb);
    }
});

// Check file type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|svg/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

// Add new cryptocurrency (admin only)
router.post('/add', [authMiddleware, adminMiddleware, upload.single('logo')], async (req, res) => {
    try {
        const {
            name,
            symbol,
            price,
            change24h,
            marketCap,
            volume24h,
            volumeChange24h
        } = req.body;

        // Create new cryptocurrency
        const crypto = new Cryptocurrency({
            name,
            symbol: symbol.toUpperCase(),
            logo: `/uploads/logos/${req.file.filename}`,
            price: Number(price),
            change24h: Number(change24h),
            marketCap: Number(marketCap),
            volume24h: Number(volume24h),
            volumeChange24h: Number(volumeChange24h)
        });

        await crypto.save();

        res.status(201).json({
            message: 'Cryptocurrency added successfully',
            cryptocurrency: crypto
        });
    } catch (error) {
        console.error('Add cryptocurrency error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all cryptocurrencies
router.get('/', async (req, res) => {
    try {
        const cryptocurrencies = await Cryptocurrency.find({ isActive: true })
            .sort({ marketCap: -1 });
        
        res.json(cryptocurrencies);
    } catch (error) {
        console.error('Get cryptocurrencies error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update cryptocurrency (admin only)
router.put('/:id', [authMiddleware, adminMiddleware, upload.single('logo')], async (req, res) => {
    try {
        const updates = { ...req.body };
        if (req.file) {
            updates.logo = `/uploads/logos/${req.file.filename}`;
        }
        
        updates.updatedAt = Date.now();

        const crypto = await Cryptocurrency.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true }
        );

        if (!crypto) {
            return res.status(404).json({ error: 'Cryptocurrency not found' });
        }

        res.json({
            message: 'Cryptocurrency updated successfully',
            cryptocurrency: crypto
        });
    } catch (error) {
        console.error('Update cryptocurrency error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete cryptocurrency (admin only)
router.delete('/:id', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const { id } = req.params;

        // Check if ID is valid
        if (!id || id === 'undefined') {
            return res.status(400).json({ error: 'Invalid cryptocurrency ID' });
        }

        const crypto = await Cryptocurrency.findById(id);
        if (!crypto) {
            return res.status(404).json({ error: 'Cryptocurrency not found' });
        }

        // Soft delete by setting isActive to false
        crypto.isActive = false;
        await crypto.save();

        // Delete the logo file if it exists
        if (crypto.logo) {
            const logoPath = path.join(__dirname, '..', '..', crypto.logo);
            if (fs.existsSync(logoPath)) {
                fs.unlinkSync(logoPath);
            }
        }

        res.json({
            message: 'Cryptocurrency deleted successfully',
            id: crypto._id
        });
    } catch (error) {
        console.error('Delete cryptocurrency error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router; 