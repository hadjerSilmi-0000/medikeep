const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const db = require('../config/db');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const authController = {
    // ---------------- REGISTER ------------------
    register: async (req, res) => {
        let connection;
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
            }

            const { name, email, password, role } = req.body;

            const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
            if (existing.length > 0) {
                return res.status(409).json({ success: false, message: 'Email already in use' });
            }

            const hashedPassword = await bcrypt.hash(password, 12);
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

            connection = await db.getConnection();
            await connection.beginTransaction();

            const [result] = await connection.execute(
                `INSERT INTO users 
            (name, email, password, role, failed_login_attempts, locked_until, email_verified, verification_token, verification_expires) 
            VALUES (?, ?, ?, ?, 0, NULL, 0, ?, ?)`,
                [name, email, hashedPassword, role, verificationToken, verificationExpires]
            );

            const userId = result.insertId;

            if (role === 'doctor') {
                await connection.execute('INSERT INTO doctors (user_id) VALUES (?)', [userId]);
            } else if (role === 'patient') {
                await connection.execute('INSERT INTO patients (user_id) VALUES (?)', [userId]);
            }

            await connection.execute('INSERT INTO settings (user_id) VALUES (?)', [userId]);
            await connection.commit();

            // Send email
            const verifyLink = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
            await sendEmail(email, 'Verify your MediKeep account', `
            <p>Hi ${name},</p>
            <p>Thanks for registering. Please verify your email by clicking the link below:</p>
            <a href="${verifyLink}">${verifyLink}</a>
            <p>This link will expire in 24 hours.</p>
        `);

            res.status(201).json({
                success: true,
                message: 'User registered. Please verify your email.',
                data: { userId, name, email, role }
            });

        } catch (err) {
            if (connection) await connection.rollback();
            console.error('Register Error:', err);
            res.status(500).json({ success: false, message: 'Internal server error' });
        } finally {
            if (connection) connection.release();
        }
    },

    // ---------------- LOGIN ------------------
    login: async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
            }

            const { email, password } = req.body;
            const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);

            if (rows.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials' });

            const user = rows[0];
            const now = new Date();

            if (user.locked_until && new Date(user.locked_until) > now) {
                const mins = Math.ceil((new Date(user.locked_until) - now) / 60000);
                return res.status(403).json({ success: false, message: `Account locked. Try again in ${mins} min.` });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                let attempts = user.failed_login_attempts + 1;
                let lockedUntil = null;
                if (attempts >= 5) {
                    lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min
                    attempts = 0;
                }
                await db.execute('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?', [attempts, lockedUntil, user.id]);
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            await db.execute('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);

            const { token: accessToken, jti } = generateAccessToken(user.id, user.role);
            const refreshToken = generateRefreshToken(user);

            if (!user.email_verified) {
                return res.status(403).json({ message: 'Please verify your email first' });
            }

            // Store refresh token
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7d
            await db.execute('INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) VALUES (?, ?, ?, NOW())',
                [user.id, refreshToken, expiresAt]);

            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
                maxAge: 30 * 60 * 1000,
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: { id: user.id, name: user.name, email: user.email, role: user.role },
            });

        } catch (err) {
            console.error('Login error:', err);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    // ---------------- REFRESH TOKEN ------------------
    refreshToken: async (req, res) => {
        try {
            const token = req.cookies.refreshToken;
            if (!token) return res.status(401).json({ message: 'Refresh token missing' });

            const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

            const [tokens] = await db.execute(
                'SELECT * FROM refresh_tokens WHERE user_id = ? AND token = ?',
                [decoded.id, token]
            );
            const storedToken = tokens[0];

            if (!storedToken || new Date(storedToken.expires_at) < new Date()) {
                return res.status(403).json({ message: 'Refresh token invalid or expired' });
            }

            const { token: newAccessToken, jti } = generateAccessToken(decoded.id, decoded.role);

            res.cookie('accessToken', newAccessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
                maxAge: 30 * 60 * 1000,
            });

            res.status(200).json({ message: 'Access token refreshed' });

        } catch (err) {
            console.error('Refresh token error:', err.message);
            return res.status(403).json({ message: 'Invalid refresh token' });
        }
    },
    verifyEmail: async (req, res) => {
        const token = req.params.token;

        try {
            const [rows] = await db.execute(
                'SELECT id, verification_expires FROM users WHERE verification_token = ?',
                [token]
            );

            if (rows.length === 0) {
                return res.status(400).json({ success: false, message: 'Invalid or expired token' });
            }

            const user = rows[0];
            if (new Date(user.verification_expires) < new Date()) {
                return res.status(400).json({ success: false, message: 'Token has expired' });
            }

            await db.execute(
                'UPDATE users SET email_verified = true, verification_token = NULL, verification_expires = NULL WHERE id = ?',
                [user.id]
            );

            return res.status(200).json({ success: true, message: 'Email verified successfully' });
        } catch (err) {
            console.error('Email verification error:', err);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },


    forgotPassword: async (req, res) => {
        try {
            const { email } = req.body;
            const [users] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
            if (users.length === 0) {
                return res.status(404).json({ success: false, message: 'Email not found' });
            }

            const userId = users[0].id;
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            await db.execute(
                'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
                [userId, token, expiresAt]
            );

            const resetUrl = `http://localhost:3000/reset-password?token=${token}`;
            await sendEmail(
                email,
                'Password Reset Request',
                `
        <p>Click the link below to reset your password. This link expires in 1 hour:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you did not request this, ignore this email.</p>
    `
            );


            res.json({ success: true, message: 'Reset link sent to your email' });
        } catch (err) {
            console.error('Forgot password error:', err.message);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },
    resetPassword: async (req, res) => {
        try {
            const { token, password } = req.body;
            const [records] = await db.execute(
                'SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
                [token]
            );
            if (records.length === 0) {
                return res.status(400).json({ success: false, message: 'Token is invalid or expired' });
            }

            const userId = records[0].user_id;
            const hashedPassword = await bcrypt.hash(password, 12);
            await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
            await db.execute('DELETE FROM password_reset_tokens WHERE user_id = ?', [userId]);

            res.json({ success: true, message: 'Password reset successful' });
        } catch (err) {
            console.error('Reset password error:', err.message);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },
    logout: async (req, res) => {
        try {
            const jti = req.user.jti;
            const userId = req.user.id;

            // Add jti to blacklist
            const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // same as access token expiry
            await db.execute(
                'INSERT INTO token_blacklist (jti, expires_at) VALUES (?, ?)',
                [jti, expiresAt]
            );

            // Delete refresh token
            await db.execute(
                'DELETE FROM refresh_tokens WHERE user_id = ?',
                [userId]
            );

            // Clear cookies
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');

            console.log(`User ${userId} logged out. JTI blacklisted.`);
            res.json({ success: true, message: 'Logged out successfully' });

        } catch (err) {
            console.error('Logout error:', err.message);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },



};

module.exports = authController;
