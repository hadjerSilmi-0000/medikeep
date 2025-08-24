const validator = require('validator');
const xss = require('xss');

// General input sanitization middleware
// Sanitizes all string inputs in req.body, req.query, and req.params
const sanitizeInput = (req, res, next) => {
    try {
        // Sanitize request body
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body);
        }

        // Sanitize query parameters
        if (req.query && typeof req.query === 'object') {
            req.query = sanitizeObject(req.query);
        }

        // Sanitize URL parameters
        if (req.params && typeof req.params === 'object') {
            req.params = sanitizeObject(req.params);
        }

        next();
    } catch (error) {
        console.error('Sanitization error:', error);
        return res.status(400).json({
            success: false,
            message: 'Invalid input data'
        });
    }
};

// Recursively sanitize object properties
const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    // Prevent prototype pollution
    if (obj.constructor !== Object && obj.constructor !== Array) {
        return {};
    }

    const sanitized = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
        // Prevent prototype pollution
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            continue;
        }

        if (obj.hasOwnProperty(key)) {
            const value = obj[key];

            if (typeof value === 'string') {
                sanitized[key] = sanitizeString(value);
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
    }

    return sanitized;
};

// Sanitize individual string values
const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;

    // Basic XSS protection - remove/escape HTML tags
    let sanitized = xss(str, {
        whiteList: {}, // No HTML tags allowed
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script', 'style']
    });

    // Trim whitespace
    sanitized = sanitized.trim();

    // Remove null bytes (potential for directory traversal)
    sanitized = sanitized.replace(/\0/g, '');

    // Escape SQL injection attempts (additional protection beyond parameterized queries)
    sanitized = sanitized.replace(/['";\\]/g, '\\$&');

    return sanitized;
};

// Specific sanitization for email fields
const sanitizeEmail = (req, res, next) => {
    if (req.body.email) {
        // Normalize email
        req.body.email = validator.normalizeEmail(req.body.email, {
            gmail_remove_dots: false,
            gmail_remove_subaddress: false,
            outlookdotcom_remove_subaddress: false,
            yahoo_remove_subaddress: false,
            icloud_remove_subaddress: false
        }) || req.body.email;

        // Additional email sanitization
        req.body.email = req.body.email.toLowerCase().trim();
    }
    next();
};

// Specific sanitization for name fields
const sanitizeName = (req, res, next) => {
    if (req.body.name) {
        // Remove potentially dangerous characters but keep spaces and hyphens
        req.body.name = req.body.name
            .replace(/[<>\"'%;()&+]/g, '') // Remove dangerous chars
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim();

        // Ensure name doesn't start/end with special characters
        req.body.name = req.body.name.replace(/^[^a-zA-Z]+|[^a-zA-Z\s-]+$/g, '');
    }
    next();
};

// Specific sanitization for password reset tokens
const sanitizeToken = (req, res, next) => {
    // For URL params (like /verify/:token)
    if (req.params.token) {
        req.params.token = req.params.token.replace(/[^a-zA-Z0-9]/g, '');
    }

    // For request body
    if (req.body.token) {
        req.body.token = req.body.token.replace(/[^a-zA-Z0-9]/g, '');
    }

    next();
};

// Sanitization middleware specifically for auth routes
const sanitizeAuthInput = (req, res, next) => {
    try {
        // Apply general sanitization first
        sanitizeInput(req, res, () => {
            // Apply specific auth sanitizations
            sanitizeEmail(req, res, () => {
                sanitizeName(req, res, () => {
                    sanitizeToken(req, res, next);
                });
            });
        });
    } catch (error) {
        console.error('Auth sanitization error:', error);
        return res.status(400).json({
            success: false,
            message: 'Invalid input format'
        });
    }
};

// Content Security Policy headers
const setSecurityHeaders = (req, res, next) => {
    // Prevent XSS attacks
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Content Security Policy
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';");

    next();
};

module.exports = {
    sanitizeInput,
    sanitizeEmail,
    sanitizeName,
    sanitizeToken,
    sanitizeAuthInput,
    setSecurityHeaders
};