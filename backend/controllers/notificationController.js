const Notification = require('../models/notification.model');
const db = require('../config/db');

// Get all notifications for logged-in user
exports.getAll = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.sub;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID missing' });
        }
        const [notifications] = await db.execute(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        res.json({ success: true, data: notifications });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Mark a notification as read
exports.markRead = async (req, res) => {
    try {
        const id = req.params.id;
        const updated = await Notification.markRead(id);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
