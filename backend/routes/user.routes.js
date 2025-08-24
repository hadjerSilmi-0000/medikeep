const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const checkRole = require('../middlewares/roleMiddleware');
const asyncWrapper = require('../utils/asyncWrapper');

// Doctor-only dashboard
router.get('/doctor-dashboard', authenticate, checkRole(['doctor']), asyncWrapper(async (req, res) =>
    res.json({ success: true, message: `Welcome Dr. ${req.user.name}`, user: { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role } })));

// Patient-only dashboard
router.get('/patient-dashboard', authenticate, checkRole(['patient']), asyncWrapper(async (req, res) =>
    res.json({ success: true, message: `Hello ${req.user.name}`, user: { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role } })));

// Shared profile route
router.get('/profile', authenticate, checkRole(['doctor', 'patient']), asyncWrapper(async (req, res) =>
    res.json({ success: true, message: 'User profile retrieved successfully', user: { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role, created_at: req.user.created_at } })));

module.exports = router;
