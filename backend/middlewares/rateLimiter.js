const rateLimit = require('express-rate-limit');

// Login rate limiter - strictest since it's most vulnerable to brute force
const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Max 5 requests per window per IP
    message: {
        success: false,
        message: 'Too many login attempts. Please try again in 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Register rate limiter - prevent spam registrations
const registerRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Max 3 registrations per hour per IP
    message: {
        success: false,
        message: 'Too many registration attempts. Please try again in 1 hour.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Forgot password rate limiter - prevent email bombing
const forgotPasswordRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Max 3 forgot password requests per hour per IP
    message: {
        success: false,
        message: 'Too many password reset requests. Please try again in 1 hour.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Email verification rate limiter - prevent verification spam
const verifyEmailRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5min
    max: 5, // Max 5 verification attempts per hour per IP
    message: {
        success: false,
        message: 'Too many email verification attempts. Please try again in 1 hour.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Reset password rate limiter - prevent reset spam
const resetPasswordRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Max 5 reset attempts per hour per IP
    message: {
        success: false,
        message: 'Too many password reset attempts. Please try again in 1 hour.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// General auth rate limiter - overall protection for authenticated routes
const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Max 100 requests per 15 minutes per IP for auth routes
    message: {
        success: false,
        message: 'Too many requests. Please slow down.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Refresh token rate limiter - prevent token refresh abuse
const refreshTokenRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Max 10 refresh attempts per 15 minutes per IP
    message: {
        success: false,
        message: 'Too many token refresh attempts. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    loginRateLimiter,
    registerRateLimiter,
    forgotPasswordRateLimiter,
    verifyEmailRateLimiter,
    resetPasswordRateLimiter,
    authRateLimiter,
    refreshTokenRateLimiter
};