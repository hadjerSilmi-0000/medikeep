const express = require('express');
const authController = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../validations/authValidation');
const loginRateLimiter = require('../middlewares/rateLimiter');

const router = express.Router();

// Routes
//signup route
router.post('/register', registerValidation, authController.register);
//login route
router.post('/login', loginRateLimiter, loginValidation, authController.login);
//Refresh Token route
router.post('/refresh', authController.refreshToken);


module.exports = router;
