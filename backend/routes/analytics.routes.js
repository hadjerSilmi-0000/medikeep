const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const authenticate = require('../middlewares/authMiddleware');
const checkRole = require('../middlewares/roleMiddleware');

// Doctor-only analytics
router.get('/doctor', authenticate, checkRole(['doctor']), analyticsController.getDoctorAnalytics);

module.exports = router;
