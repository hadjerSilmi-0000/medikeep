const express = require('express');
const authController = require('../controllers/authController');
const loginRateLimiter = require('../middlewares/rateLimiter');
const authenticate = require('../middlewares/authMiddleware');
const { registerValidation: authRegisterValidation, loginValidation } = require('../validations/authValidation');
const { registerValidation, resetPasswordValidation } = require('../middlewares/validators');
const router = express.Router();

// Routes
//signup route
router.post('/register', registerValidation, authController.register);
//login route
router.post('/login', loginRateLimiter, loginValidation, authController.login);
//Refresh Token route
router.post('/refresh', authController.refreshToken);

router.get('/profile', authenticate, (req, res) => {
    res.status(200).json({
        success: true,
        message: 'You are authenticated',
        user: req.user,
    });
});
//email verification 
router.get('/verify/:token', authController.verifyEmail);
//reset & forgot  password
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
//logout route
router.post('/logout', authenticate, authController.logout);

module.exports = router;
