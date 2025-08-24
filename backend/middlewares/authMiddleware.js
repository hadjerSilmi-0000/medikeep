const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const { verifyToken, generateAccessToken } = require('../utils/generateToken');
require('dotenv').config();

// Security constants
const MAX_TOKEN_AGE = 30 * 60 * 1000; // 30 minutes in milliseconds
const TIMING_SAFE_DELAY = 100; // Constant delay to prevent timing attacks

// Timing-safe delay to prevent timing attacks
const timingSafeDelay = () => {
    return new Promise(resolve => setTimeout(resolve, TIMING_SAFE_DELAY));
};

// Enhanced authentication middleware with security improvements
const authenticate = async (req, res, next) => {
    try {
        // Extract token from cookie
        const accessToken = req.cookies.accessToken;

        if (!accessToken) {
            await timingSafeDelay();
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        let decoded;
        try {
            // Use enhanced token verification
            decoded = verifyToken(accessToken, process.env.ACCESS_TOKEN_SECRET, 'access');
        } catch (err) {
            if (err.message.includes('expired')) {
                // Try automatic refresh
                return await tryAutoRefresh(req, res, next);
            } else {
                await timingSafeDelay();
                return res.status(401).json({
                    success: false,
                    message: 'Invalid authentication token'
                });
            }
        }

        // Enhanced security checks
        await performSecurityChecks(decoded, req);

        // Set user context
        req.user = {
            id: parseInt(decoded.sub),
            role: decoded.role,
            jti: decoded.jti,
            fingerprint: decoded.fp,
            tokenIssuedAt: decoded.iat
        };

        next();

    } catch (err) {
        await timingSafeDelay();
        console.error('Authentication error:', {
            message: err.message,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        });

        return res.status(401).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

// Perform additional security checks on the token
const performSecurityChecks = async (decoded, req) => {
    // Check if token is blacklisted
    const [blacklisted] = await db.execute(
        'SELECT id FROM token_blacklist WHERE jti = ? AND expires_at > NOW()',
        [decoded.jti]
    );

    if (blacklisted.length > 0) {
        throw new Error('Token has been revoked');
    }

    // Check token age (additional security layer)
    const tokenAge = Date.now() - (decoded.iat * 1000);
    if (tokenAge > MAX_TOKEN_AGE) {
        throw new Error('Token is too old');
    }

    // Validate issuer and audience
    if (decoded.iss !== 'medikeep-api' || decoded.aud !== 'medikeep-client') {
        throw new Error('Invalid token claims');
    }

    // Check if user still exists and is active
    const [users] = await db.execute(
        'SELECT id, email_verified FROM users WHERE id = ?',
        [decoded.sub]
    );

    if (users.length === 0) {
        throw new Error('User no longer exists');
    }

    if (!users[0].email_verified) {
        throw new Error('Email verification required');
    }
};

// Enhanced automatic token refresh with security improvements
const tryAutoRefresh = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            await timingSafeDelay();
            return res.status(401).json({
                success: false,
                message: 'Session expired. Please log in again.'
            });
        }

        let decoded;
        try {
            decoded = verifyToken(refreshToken, process.env.REFRESH_TOKEN_SECRET, 'refresh');
        } catch (err) {
            await timingSafeDelay();
            return res.status(401).json({
                success: false,
                message: 'Session expired. Please log in again.'
            });
        }

        // Verify refresh token exists in database and is still valid
        const [tokens] = await db.execute(
            'SELECT * FROM refresh_tokens WHERE user_id = ? AND token = ? AND expires_at > NOW()',
            [decoded.sub, refreshToken]
        );

        if (tokens.length === 0) {
            await timingSafeDelay();
            return res.status(401).json({
                success: false,
                message: 'Session expired. Please log in again.'
            });
        }

        // Additional security check for refresh token
        const storedToken = tokens[0];
        const tokenAge = Date.now() - new Date(storedToken.created_at).getTime();
        const maxRefreshAge = 7 * 24 * 60 * 60 * 1000; // 7 days

        if (tokenAge > maxRefreshAge) {
            // Clean up expired token
            await db.execute('DELETE FROM refresh_tokens WHERE id = ?', [storedToken.id]);
            await timingSafeDelay();
            return res.status(401).json({
                success: false,
                message: 'Session expired. Please log in again.'
            });
        }

        // Generate new access token with enhanced security
        const { token: newAccessToken, jti, fingerprint } = generateAccessToken(decoded.sub, decoded.role);

        // Set new access token cookie with security flags
        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 30 * 60 * 1000, // 30 minutes
            path: '/'
        });

        // Set user context
        req.user = {
            id: parseInt(decoded.sub),
            role: decoded.role,
            jti: jti,
            fingerprint: fingerprint,
            tokenIssuedAt: Math.floor(Date.now() / 1000)
        };

        next();

    } catch (err) {
        await timingSafeDelay();
        console.error('Auto-refresh failed:', {
            message: err.message,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        });

        return res.status(401).json({
            success: false,
            message: 'Session expired. Please log in again.'
        });
    }
};

// Middleware to check if user has required role
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }

        next();
    };
};

// Middleware to ensure user is the owner of the resource or has admin role
const requireOwnershipOrAdmin = (userIdParam = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const resourceUserId = req.params[userIdParam] || req.body.userId;
        const isOwner = req.user.id === parseInt(resourceUserId);
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only access your own resources.'
            });
        }

        next();
    };
};

// Extract user info from token without full authentication (for optional auth)
const optionalAuth = async (req, res, next) => {
    try {
        const accessToken = req.cookies.accessToken;

        if (accessToken) {
            const decoded = verifyToken(accessToken, process.env.ACCESS_TOKEN_SECRET, 'access');

            req.user = {
                id: parseInt(decoded.sub),
                role: decoded.role,
                jti: decoded.jti
            };
        }
    } catch (err) {
        // Silently fail for optional authentication
        req.user = null;
    }

    next();
};

module.exports = {
    authenticate,
    tryAutoRefresh,
    requireRole,
    requireOwnershipOrAdmin,
    optionalAuth
};