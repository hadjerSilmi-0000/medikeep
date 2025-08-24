const asyncWrapper = require('../utils/asyncWrapper');
const authService = require('../services/authService');
const db = require('../config/db');

const authController = {
    // ---------------- REGISTER ------------------
    register: asyncWrapper(async (req, res, next) => {
        const { name, email, password, role } = req.body;

        // Check if email already exists
        const emailExists = await authService.checkEmailExists(email);
        if (emailExists) {
            return res.status(409).json({
                success: false,
                message: 'Email already in use'
            });
        }

        // Create user and get verification token
        const { userId, verificationToken, userData } = await authService.createUser({
            name, email, password, role
        });

        // Send verification email
        await authService.sendVerificationEmail(email, name, verificationToken);

        res.status(201).json({
            success: true,
            message: 'User registered. Please verify your email.',
            data: userData
        });
    }),

    // ---------------- LOGIN ------------------
    login: asyncWrapper(async (req, res, next) => {
        const { email, password } = req.body;

        // Find user by email
        const user = await authService.findUserByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if account is locked
        const lockStatus = authService.isAccountLocked(user);
        if (lockStatus.locked) {
            return res.status(403).json({
                success: false,
                message: `Account locked. Try again in ${lockStatus.minutesRemaining} min.`
            });
        }

        // Validate password
        const isPasswordValid = await authService.validatePassword(password, user.password);
        if (!isPasswordValid) {
            await authService.handleFailedLogin(user.id, user.failed_login_attempts);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Reset failed login attempts
        await authService.resetFailedLoginAttempts(user.id);

        // Check email verification
        if (!user.email_verified) {
            return res.status(403).json({
                success: false,
                message: 'Please verify your email first'
            });
        }

        // Generate and store tokens
        const { accessToken, refreshToken } = await authService.generateAndStoreTokens(user);

        // Set secure cookies
        authService.setAuthCookies(res, accessToken, refreshToken);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: authService.getUserProfile(user)
        });
    }),

    // ---------------- GET PROFILE ------------------
    getProfile: asyncWrapper(async (req, res, next) => {
        const userId = req.user.id;
        const userRole = req.user.role;

        // Since we have the user ID from JWT, we can fetch fresh user data
        const [rows] = await db.execute(
            'SELECT id, name, email, role, email_verified FROM users WHERE id = ?',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = rows[0];

        res.status(200).json({
            success: true,
            message: 'Profile retrieved successfully',
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                emailVerified: user.email_verified
            }
        });
    }),

    // ---------------- REFRESH TOKEN ------------------
    refreshToken: asyncWrapper(async (req, res, next) => {
        const token = req.cookies.refreshToken;
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token missing'
            });
        }

        try {
            // Validate refresh token
            const decoded = await authService.validateRefreshToken(token);

            // Generate new access token
            const { token: newAccessToken } = authService.generateNewAccessToken(decoded.sub, decoded.role);

            // Set new access token cookie
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
                maxAge: 30 * 60 * 1000,
                path: '/',
                domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined
            };

            res.cookie('accessToken', newAccessToken, cookieOptions);

            res.status(200).json({
                success: true,
                message: 'Access token refreshed'
            });

        } catch (error) {
            return res.status(403).json({
                success: false,
                message: 'Refresh token invalid or expired'
            });
        }
    }),

    // ---------------- VERIFY EMAIL ------------------
    verifyEmail: asyncWrapper(async (req, res, next) => {
        const token = req.params.token;

        try {
            // Verify email token
            const user = await authService.verifyEmailToken(token);

            // Mark email as verified
            await authService.markEmailAsVerified(user.id);

            return res.status(200).json({
                success: true,
                message: 'Email verified successfully'
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }),

    // ---------------- FORGOT PASSWORD ------------------
    forgotPassword: asyncWrapper(async (req, res, next) => {
        const { email } = req.body;

        // Find user by email
        const user = await authService.findUserByEmail(email);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Email not found'
            });
        }

        // Create password reset token
        const resetToken = await authService.createPasswordResetToken(user.id);

        // Send password reset email
        await authService.sendPasswordResetEmail(email, resetToken);

        res.json({
            success: true,
            message: 'Reset link sent to your email'
        });
    }),

    // ---------------- RESET PASSWORD ------------------
    resetPassword: asyncWrapper(async (req, res, next) => {
        const { token, password } = req.body;

        try {
            // Validate password reset token
            const resetRecord = await authService.validatePasswordResetToken(token);

            // Update user password
            await authService.updatePassword(resetRecord.user_id, password);

            // Clean up password reset tokens
            await authService.cleanupPasswordResetTokens(resetRecord.user_id);

            res.json({
                success: true,
                message: 'Password reset successful'
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }),

    // ---------------- LOGOUT ------------------
    logout: asyncWrapper(async (req, res, next) => {
        const jti = req.user.jti;
        const userId = req.user.id;

        // Blacklist current JWT token
        await authService.blacklistToken(jti);

        // Remove all refresh tokens for user
        await authService.removeUserRefreshTokens(userId);

        // Clear authentication cookies
        authService.clearAuthCookies(res);

        console.log(`User ${userId} logged out. JTI blacklisted.`);
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    })
};

module.exports = authController;