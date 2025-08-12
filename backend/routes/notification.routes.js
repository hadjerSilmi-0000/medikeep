const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authenticate = require('../middlewares/authMiddleware');

// Get all notifications for current user
router.get('/', authenticate, notificationController.getAll);

// Mark as read
router.put('/:id/read', authenticate, notificationController.markRead);

module.exports = router;
