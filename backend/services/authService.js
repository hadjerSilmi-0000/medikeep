const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const authService = {
    // Check if email already exists
    async checkEmailExists(email) {
        const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
        return existing.length > 0;
    },

    // Create new user with role-specific records
    async createUser({ name, email, password, role }) {
        let connection;
        try {
            const hashedPassword = await bcrypt.hash(password, 12);
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            connection = await db.getConnection();
            await connection.beginTransaction();

            // Insert user
            const [result] = await connection.execute(
                `INSERT INTO users 
                (name, email, password, role, failed_login_attempts, locked_until, email_verified, verification_token, verification_expires) 
                VALUES (?, ?, ?, ?, 0, NULL, 0, ?, ?)`,
                [name, email, hashedPassword, role, verificationToken, verificationExpires]
            );

            const userId = result.insertId;

            // Create role-specific records
            if (role === 'doctor') {
                await connection.execute('INSERT INTO doctors (user_id) VALUES (?)', [userId]);
            } else if (role === 'patient') {
                await connection.execute('INSERT INTO patients (user_id) VALUES (?)', [userId]);
            }

            // Create settings record
            await connection.execute('INSERT INTO settings (user_id) VALUES (?)', [userId]);

            await connection.commit();

            return {
                userId,
                verificationToken,
                userData: { userId, name, email, role }
            };

        } catch (err) {
            if (connection) await connection.rollback();
            throw err;
        } finally {
            if (connection) connection.release();
        }
    },

    // Send verification email
    async sendVerificationEmail(email, name, verificationToken) {
        const verifyLink = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;

        await sendEmail({
            to: email,
            subject: 'Verify your MediKeep account',
            html: `
                <p>Hi ${name},</p>
                <p>Thanks for registering. Please verify your email by clicking the link below:</p>
                <a href="${verifyLink}">${verifyLink}</a>
                <p>This link will expire in 24 hours.</p>
            `,
            text: `Hi ${name}, Thanks for registering. Please verify your email by visiting: ${verifyLink}. This link will expire in 24 hours.`
        });
    },

    // Find user by email
    async findUserByEmail(email) {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0] || null;
    },

    // Check if account is locked
    isAccountLocked(user) {
        if (!user.locked_until) return false;

        const now = new Date();
        const lockedUntil = new Date(user.locked_until);

        if (lockedUntil > now) {
            const mins = Math.ceil((lockedUntil - now) / 60000);
            return { locked: true, minutesRemaining: mins };
        }

        return { locked: false };
    },

    // Handle failed login attempt
    async handleFailedLogin(userId, currentAttempts) {
        let attempts = currentAttempts + 1;
        let lockedUntil = null;

        if (attempts >= 5) {
            lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
            attempts = 0;
        }

        await db.execute(
            'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?',
            [attempts, lockedUntil, userId]
        );
    },

    // Reset failed login attempts
    async resetFailedLoginAttempts(userId) {
        await db.execute(
            'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?',
            [userId]
        );
    },

    // Validate password
    async validatePassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    },

    // Generate and store authentication tokens
    async generateAndStoreTokens(user) {
        const { token: accessToken, jti, fingerprint } = generateAccessToken(user.id, user.role);
        const { token: refreshToken, tokenId } = generateRefreshToken(user);

        // Store refresh token
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await db.execute(
            'INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) VALUES (?, ?, ?, NOW())',
            [user.id, refreshToken, expiresAt]
        );

        return { accessToken, refreshToken, jti, fingerprint };
    },

    // Set secure authentication cookies
    setAuthCookies(res, accessToken, refreshToken) {
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            path: '/',
            domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined
        };

        res.cookie('accessToken', accessToken, {
            ...cookieOptions,
            maxAge: 30 * 60 * 1000, // 30 minutes
        });

        res.cookie('refreshToken', refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
    },

    // Validate and refresh token
    async validateRefreshToken(token) {
        const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, {
            algorithms: ['HS256'],
            issuer: 'medikeep-api',
            audience: 'medikeep-client'
        });

        const [tokens] = await db.execute(
            'SELECT * FROM refresh_tokens WHERE user_id = ? AND token = ? AND expires_at > NOW()',
            [decoded.sub, token]
        );

        const storedToken = tokens[0];
        if (!storedToken || new Date(storedToken.expires_at) < new Date()) {
            throw new Error('Refresh token invalid or expired');
        }

        return decoded;
    },

    // Generate new access token
    generateNewAccessToken(userId, role) {
        return generateAccessToken(userId, role);
    },

    // Verify email token
    async verifyEmailToken(token) {
        const [rows] = await db.execute(
            'SELECT id, verification_expires FROM users WHERE verification_token = ?',
            [token]
        );

        if (rows.length === 0) {
            throw new Error('Invalid or expired token');
        }

        const user = rows[0];
        if (new Date(user.verification_expires) < new Date()) {
            throw new Error('Token has expired');
        }

        return user;
    },

    // Mark email as verified
    async markEmailAsVerified(userId) {
        await db.execute(
            'UPDATE users SET email_verified = true, verification_token = NULL, verification_expires = NULL WHERE id = ?',
            [userId]
        );
    },

    // Create password reset token
    async createPasswordResetToken(userId) {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await db.execute(
            'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [userId, token, expiresAt]
        );

        return token;
    },

    // Send password reset email
    async sendPasswordResetEmail(email, token) {
        const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

        await sendEmail({
            to: email,
            subject: 'Password Reset Request',
            html: `
                <p>Click the link below to reset your password. This link expires in 1 hour:</p>
                <p><a href="${resetUrl}">${resetUrl}</a></p>
                <p>If you did not request this, ignore this email.</p>
            `,
            text: `Click the link below to reset your password. This link expires in 1 hour: ${resetUrl}. If you did not request this, ignore this email.`
        });
    },

    // Validate password reset token
    async validatePasswordResetToken(token) {
        const [records] = await db.execute(
            'SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
            [token]
        );

        if (records.length === 0) {
            throw new Error('Token is invalid or expired');
        }

        return records[0];
    },

    // Update user password
    async updatePassword(userId, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
    },

    // Clean up password reset tokens
    async cleanupPasswordResetTokens(userId) {
        await db.execute('DELETE FROM password_reset_tokens WHERE user_id = ?', [userId]);
    },

    // Blacklist JWT token
    async blacklistToken(jti) {
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        await db.execute(
            'INSERT INTO token_blacklist (jti, expires_at) VALUES (?, ?)',
            [jti, expiresAt]
        );
    },

    // Remove all refresh tokens for user
    async removeUserRefreshTokens(userId) {
        await db.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
    },

    // Clear authentication cookies
    clearAuthCookies(res) {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
    },

    // Get user profile data
    getUserProfile(user) {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };
    }
};

module.exports = authService;