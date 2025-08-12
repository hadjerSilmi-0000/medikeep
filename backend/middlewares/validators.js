const { body } = require('express-validator');

exports.registerValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[0-9]/).withMessage('Password must contain a number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain a symbol'),
    body('role').isIn(['doctor', 'patient']).withMessage('Invalid role')
];

exports.resetPasswordValidation = [
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[0-9]/).withMessage('Password must contain a number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain a symbol')
];

exports.bookAppointmentValidation = [
    body('doctor_id')
        .isInt({ gt: 0 }).withMessage('Doctor ID must be a positive integer'),
    body('date_time')
        .isISO8601().withMessage('Valid date_time is required'),
    body('reason')
        .isLength({ min: 5 }).withMessage('Reason must be at least 5 characters long')
];
