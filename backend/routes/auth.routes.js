const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const {
    loginRateLimiter,
    registerRateLimiter,
    forgotPasswordRateLimiter,
    verifyEmailRateLimiter,
    resetPasswordRateLimiter,
    authRateLimiter,
    refreshTokenRateLimiter
} = require('../middlewares/rateLimiter');
const { authenticate } = require('../middlewares/authMiddleware');
const { registerValidation, loginValidation } = require('../validations/authValidation');
const { sanitizeAuthInput, setSecurityHeaders } = require('../middlewares/sanitizer');


//  Apply security middleware to all auth routes
router.use(setSecurityHeaders);
router.use(sanitizeAuthInput);

// Registration
router.post('/register', registerRateLimiter, registerValidation, authController.register);
// Login
router.post('/login', loginRateLimiter, loginValidation, authController.login);
// Refresh token
router.post('/refresh', refreshTokenRateLimiter, authController.refreshToken);
// Profile
router.get('/profile', authRateLimiter, authenticate, authController.getProfile);
// Email verification
router.get('/verify/:token', verifyEmailRateLimiter, authController.verifyEmail);
// Forgot password
router.post('/forgot-password', forgotPasswordRateLimiter, authController.forgotPassword);
// Reset password
router.post('/reset-password', resetPasswordRateLimiter, authController.resetPassword);
// Logout
router.post('/logout', authRateLimiter, authenticate, authController.logout);

module.exports = router;
