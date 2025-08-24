const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const listEndpoints = require('express-list-endpoints');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const patientRoutes = require('./routes/patient.routes');
const doctorRoutes = require('./routes/doctor.routes');
const prescriptionRoutes = require('./routes/prescription.routes');
const AppointmentRoutes = require('./routes/appointment.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const notificationsRoutes = require('./routes/notification.routes');

// Import utilities
const cleanExpiredTokens = require('./utils/cleanup');
const Appointment = require('./models/appointment.model');

const app = express();

// ========================================
// SECURITY MIDDLEWARE
// ========================================
app.use(helmet());

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    }
});
app.use(limiter);

// ========================================
// BODY PARSING MIDDLEWARE
// ========================================
app.use(express.json({ limit: '10mb' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ========================================
// BACKGROUND TASKS
// ========================================
// Clean expired tokens every 12 hours
setInterval(cleanExpiredTokens, 12 * 60 * 60 * 1000);

// ========================================
// HEALTH CHECK ENDPOINT
// ========================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'MediKeep API'
    });
});

// ========================================
// API ROUTES
// ========================================
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/appointments', AppointmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationsRoutes);

// ========================================
// DEVELOPMENT UTILITIES
// ========================================
if (process.env.NODE_ENV === 'development') {
    console.log('Registered Endpoints:', listEndpoints(app));
}

// ========================================
// ERROR HANDLING MIDDLEWARE (MUST BE LAST!)
// ========================================
// 404 fallback - must come before error handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Error handler middleware - MOVED TO THE END
app.use(require('./middlewares/errorHandler'));

// Global error handler - must be absolute last
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

module.exports = app;