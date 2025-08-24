const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Security constants
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '30m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
const JWT_ALGORITHM = 'HS256'; // Explicit algorithm specification


//Validate environment variables for JWT secrets
const validateSecrets = () => {
    const accessSecret = process.env.ACCESS_TOKEN_SECRET;
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET;

    if (!accessSecret || accessSecret.length < 32) {
        throw new Error('ACCESS_TOKEN_SECRET must be at least 32 characters long');
    }

    if (!refreshSecret || refreshSecret.length < 32) {
        throw new Error('REFRESH_TOKEN_SECRET must be at least 32 characters long');
    }

    if (accessSecret === refreshSecret) {
        throw new Error('ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be different');
    }
};


//Generate a secure access token with enhanced security measures
function generateAccessToken(userId, role) {
    try {
        validateSecrets();

        // Generate unique JWT ID for tracking and blacklisting
        const jti = uuidv4();

        // Current timestamp
        const now = Math.floor(Date.now() / 1000);

        // Enhanced payload with security claims
        const payload = {
            sub: userId.toString(), // Subject (user ID) as string
            iat: now, // Issued at
            jti: jti, // JWT ID for blacklisting

            // Custom claims
            role: role,
            type: 'access',

            // Security fingerprint (helps detect token theft)
            fp: crypto.randomBytes(16).toString('hex')
        };

        // Sign token with explicit algorithm & audience in options
        const token = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
            algorithm: JWT_ALGORITHM,
            expiresIn: ACCESS_TOKEN_EXPIRY,
            notBefore: 0, // Token valid immediately
            issuer: 'medikeep-api',
            audience: 'medikeep-client'
        });

        return {
            token,
            jti,
            fingerprint: payload.fp,
            expiresIn: ACCESS_TOKEN_EXPIRY
        };

    } catch (error) {
        console.error('Access token generation failed:', error.message);
        throw new Error('Token generation failed');
    }
}


//Generate a secure refresh token with rotation capability
const generateRefreshToken = (user, previousTokenId = null) => {
    try {
        validateSecrets();

        // Generate unique token ID
        const tokenId = uuidv4();

        // Current timestamp
        const now = Math.floor(Date.now() / 1000);

        // Enhanced payload for refresh token
        const payload = {
            sub: user.id.toString(),
            iat: now,
            jti: tokenId,

            // Custom claims
            role: user.role,
            type: 'refresh',

            // Token family for rotation tracking
            family: previousTokenId || tokenId,

            // Security measures
            fp: crypto.randomBytes(16).toString('hex')
        };

        const token = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
            algorithm: JWT_ALGORITHM,
            expiresIn: REFRESH_TOKEN_EXPIRY,
            issuer: 'medikeep-api',
            audience: 'medikeep-client'
        });

        return {
            token,
            tokenId,
            family: payload.family,
            fingerprint: payload.fp,
            expiresIn: REFRESH_TOKEN_EXPIRY
        };

    } catch (error) {
        console.error('Refresh token generation failed:', error.message);
        throw new Error('Refresh token generation failed');
    }
};


//Verify and decode JWT token with enhanced security
const verifyToken = (token, secret, tokenType = 'access') => {
    try {
        const decoded = jwt.verify(token, secret, {
            algorithms: [JWT_ALGORITHM],
            issuer: 'medikeep-api',
            audience: 'medikeep-client',
            clockTolerance: 30 // 30 seconds clock tolerance
        });

        // Verify token type matches expected
        if (decoded.type !== tokenType) {
            throw new Error(`Invalid token type. Expected ${tokenType}, got ${decoded.type}`);
        }

        return decoded;

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token has expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token signature');
        } else if (error.name === 'NotBeforeError') {
            throw new Error('Token not active yet');
        } else {
            throw new Error('Token verification failed');
        }
    }
};

//Extract token info without verification (for logging/debugging)
const decodeTokenUnsafe = (token) => {
    try {
        return jwt.decode(token, { complete: true });
    } catch (error) {
        return null;
    }
};


//Generate secure random string for additional security
const generateSecureRandomString = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};


//Check if JWT secrets are properly configured
const checkSecurityConfiguration = () => {
    try {
        validateSecrets();
        return {
            valid: true,
            accessSecretLength: process.env.ACCESS_TOKEN_SECRET?.length || 0,
            refreshSecretLength: process.env.REFRESH_TOKEN_SECRET?.length || 0,
            algorithm: JWT_ALGORITHM,
            accessExpiry: ACCESS_TOKEN_EXPIRY,
            refreshExpiry: REFRESH_TOKEN_EXPIRY
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyToken,
    decodeTokenUnsafe,
    generateSecureRandomString,
    checkSecurityConfiguration,

    // Constants for consistent usage
    ACCESS_TOKEN_EXPIRY,
    REFRESH_TOKEN_EXPIRY,
    JWT_ALGORITHM
};