const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authMiddleware');
const checkRole = require('../middlewares/roleMiddleware');

//  Doctor-only route
router.get('/doctor-dashboard', authenticate, checkRole(['doctor']), (req, res) => {
    res.json({ message: 'Welcome doctor ', user: req.user });
});

// Patient-only route
router.get('/patient-dashboard', authenticate, checkRole(['patient']), (req, res) => {
    res.json({ message: 'Hello patient ', user: req.user });
});

// Shared route
router.get('/profile', authenticate, checkRole(['doctor', 'patient']), (req, res) => {
    res.json({
        success: true,
        message: 'You are authenticated',
        user: req.user,
    });
});
module.exports = router;
