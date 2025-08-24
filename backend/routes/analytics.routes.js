const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middlewares/authMiddleware');
const checkRole = require('../middlewares/roleMiddleware');

// Role-specific analytics endpoints
router.get('/doctor', authenticate, checkRole(['doctor']), analyticsController.getDoctorAnalytics);
router.get('/patient', authenticate, checkRole(['patient']), analyticsController.getPatientAnalytics);

// Universal dashboard stats (routes to appropriate analytics based on role)
router.get('/dashboard', authenticate, checkRole(['doctor', 'patient']), analyticsController.getDashboardStats);

module.exports = router;