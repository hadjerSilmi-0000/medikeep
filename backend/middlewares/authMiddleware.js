const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const authenticate = async (req, res, next) => {
    try {
        const accessToken = req.cookies.accessToken;

        if (!accessToken) throw new Error('Access token missing');

        let decoded;
        try {
            decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return await tryAutoRefresh(req, res, next);
            } else {
                throw new Error('Invalid token');
            }
        }

        // Check if blacklisted
        const [blacklisted] = await db.execute(
            'SELECT id FROM token_blacklist WHERE jti = ? AND expires_at > NOW()',
            [decoded.jti]
        );
        if (blacklisted.length > 0) throw new Error('Token is blacklisted');

        req.user = {
            id: decoded.sub,
            role: decoded.role,
            jti: decoded.jti,
        };

        next();
    } catch (err) {
        console.error('Auth error:', err.message);
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
};

const tryAutoRefresh = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) throw new Error('Refresh token missing');

        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        // Check if refresh token exists in DB
        const [tokens] = await db.execute(
            'SELECT * FROM refresh_tokens WHERE user_id = ? AND token = ? AND expires_at > NOW()',
            [decoded.id, refreshToken]
        );
        if (tokens.length === 0) throw new Error('Refresh token not valid or expired');

        // Generate new access token
        const jti = require('uuid').v4();
        const payload = {
            sub: decoded.id,
            role: decoded.role,
            jti,
        };
        const newAccessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '30m',
        });

        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 30 * 60 * 1000,
        });

        req.user = {
            id: decoded.id,
            role: decoded.role,
            jti,
        };

        console.log('Access token refreshed from refresh token');
        next();
    } catch (err) {
        console.error('Auto-refresh failed:', err.message);
        return res.status(401).json({ success: false, message: 'Session expired, please log in again' });
    }
};


module.exports = authenticate;
