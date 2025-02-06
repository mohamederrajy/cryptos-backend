const User = require('../models/User');

const adminMiddleware = async (req, res, next) => {
    try {
        console.log('Checking admin rights for user:', req.userId); // Debug log
        const user = await User.findById(req.userId);
        
        console.log('User role:', user?.role); // Debug log
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin rights required.' });
        }

        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        res.status(401).json({ error: 'Admin authorization failed' });
    }
};

module.exports = adminMiddleware; 