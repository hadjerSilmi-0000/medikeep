const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/authMiddleware');

//  Get all notifications for the authenticated user
router.get('/', authenticate, notificationController.getAll);

//  Mark a specific notification as read by ID
router.put('/:id/read', authenticate, notificationController.markRead);

//  Mark all notifications as read
router.put('/mark-all-read', authenticate, notificationController.markAllRead);

//  Get notification stats (like unread count)
router.get('/stats', authenticate, notificationController.getStats);

//  Create a new notification
router.post('/', authenticate, notificationController.create);

module.exports = router;
