const NotificationService = require('../services/notificationService');

// Get all notifications for logged-in user with pagination
exports.getAll = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?.sub;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID missing'
            });
        }

        // Extract query parameters
        const {
            page = 1,
            limit = 10,
            sortBy = 'created_at',
            order = 'DESC'
        } = req.validatedQuery || req.query;

        // Validate pagination parameters
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // Max 50 per page

        const result = await NotificationService.getUserNotifications(
            userId,
            pageNum,
            limitNum,
            sortBy,
            order
        );

        res.json(result);
    } catch (error) {
        console.error('Error in getAll notifications:', error);
        next(error);
    }
};

// Mark a notification as read
exports.markRead = async (req, res, next) => {
    try {
        const notificationId = req.params.id;
        const userId = req.user?.id || req.user?.sub;

        if (!notificationId) {
            return res.status(400).json({
                success: false,
                message: 'Notification ID is required'
            });
        }

        const result = await NotificationService.markNotificationAsRead(notificationId, userId);
        res.json(result);
    } catch (error) {
        console.error('Error in markRead:', error);
        if (error.message === 'Notification not found or access denied') {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        next(error);
    }
};

// Mark all notifications as read for current user
exports.markAllRead = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?.sub;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID missing'
            });
        }

        const result = await NotificationService.markAllAsRead(userId);
        res.json(result);
    } catch (error) {
        console.error('Error in markAllRead:', error);
        next(error);
    }
};

// Get notification statistics
exports.getStats = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?.sub;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID missing'
            });
        }

        const result = await NotificationService.getNotificationStats(userId);
        res.json(result);
    } catch (error) {
        console.error('Error in getStats:', error);
        next(error);
    }
};

// Create and send notification (for admin/system use)
exports.create = async (req, res, next) => {
    try {
        const {
            userId,
            type,
            title,
            body,
            data,
            sendEmail,
            userEmail
        } = req.body;

        // Validate required fields
        if (!userId || !type || !title || !body) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: userId, type, title, body'
            });
        }

        const result = await NotificationService.createAndSendNotification({
            userId,
            type,
            title,
            body,
            data,
            sendEmail: sendEmail || false,
            userEmail
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Error in create notification:', error);
        next(error);
    }
};