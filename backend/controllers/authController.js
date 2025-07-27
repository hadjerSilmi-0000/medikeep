const bcrypt = require('bcrypt');
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

function generateTokens(user) {
    return {
        accessToken: generateAccessToken(user),
        refreshToken: generateRefreshToken(user)
    };
}

const authController = {
    // ---------------- REGISTER ------------------
    register: async (req, res) => {
        let connection;
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { name, email, password, role } = req.body;

            // Check if email already exists
            const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
            if (existing.length > 0) {
                return res.status(409).json({ success: false, message: 'Email already in use' });
            }

            connection = await db.getConnection();
            await connection.beginTransaction();

            const hashedPassword = await bcrypt.hash(password, 12);

            const insertUserQuery = `
                INSERT INTO users (name, email, password, role, failed_login_attempts, locked_until) 
                VALUES (?, ?, ?, ?, 0, NULL)`;
            const [result] = await connection.execute(insertUserQuery, [name, email, hashedPassword, role]);

            const userId = result.insertId;

            if (role === 'doctor') {
                await connection.execute('INSERT INTO doctors (user_id) VALUES (?)', [userId]);
            } else if (role === 'patient') {
                await connection.execute('INSERT INTO patients (user_id) VALUES (?)', [userId]);
            }

            await connection.execute('INSERT INTO settings (user_id) VALUES (?)', [userId]);

            await connection.commit();

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: { userId, name, email, role }
            });

        } catch (error) {
            if (connection) await connection.rollback();
            console.error('Registration error:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        } finally {
            if (connection) connection.release();
        }
    },

    // ---------------- LOGIN ------------------
    // ---------------- LOGIN ------------------
    login: async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
            }

            // Get user from DB
            const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
            if (rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            const user = rows[0];
            const now = new Date();

            // Check if account is locked
            if (user.locked_until && new Date(user.locked_until) > now) {
                const minutesLeft = Math.ceil((new Date(user.locked_until) - now) / 60000);
                return res.status(403).json({
                    success: false,
                    message: `Account locked. Try again in ${minutesLeft} minutes.`
                });
            }

            // Check password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                let attempts = user.failed_login_attempts + 1;
                let lockUntil = null;

                if (attempts >= 5) {
                    lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
                    attempts = 0;
                }

                await db.execute(
                    'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?',
                    [attempts, lockUntil, user.id]
                );

                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            // Reset attempts
            await db.execute(
                'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?',
                [user.id]
            );

            // Generate tokens
            const { accessToken, refreshToken } = generateTokens(user);

            // Save refresh token in DB
            await db.execute('UPDATE users SET refresh_token = ? WHERE id = ?', [
                refreshToken,
                user.id
            ]);

            // Set httpOnly cookies
            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 30 * 60 * 1000 // 30 mins
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            // Respond
            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

};

exports.refreshToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ message: 'Unauthorized: No refresh token' });
        }

        // 1. Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        // 2. Find user by id + check refresh token in DB
        const user = await User.findById(decoded.id);
        if (!user || user.refresh_token !== refreshToken) {
            return res.status(403).json({ message: 'Forbidden: Invalid refresh token' });
        }

        // 3. Generate new access token
        const accessToken = jwt.sign(
            { id: user._id, role: user.role },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '30m' }
        );

        // 4. Optional: rotate refresh token
        const newRefreshToken = jwt.sign(
            { id: user._id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' }
        );
        user.refresh_token = newRefreshToken;
        await user.save();

        // 5. Set new cookies
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            sameSite: 'Strict',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 60 * 1000 // 30 mins
        });
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            sameSite: 'Strict',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return res.status(200).json({ success: true, message: 'Access token refreshed' });

    } catch (err) {
        console.error(err);
        return res.status(403).json({ message: 'Invalid or expired refresh token' });
    }
};

module.exports = authController;
