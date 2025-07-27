const { body } = require('express-validator');

const registerValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s]+$/).withMessage('Name must contain only letters and spaces'),

    body('email')
        .isEmail().withMessage('Valid email is required')
        .normalizeEmail()
        .isLength({ max: 100 }).withMessage('Email must not exceed 100 characters'),

    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
        .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
        .matches(/\d/).withMessage('Password must contain a number')
        .matches(/[@$!%*?&]/).withMessage('Password must contain a special character'),

    body('role')
        .isIn(['doctor', 'patient']).withMessage('Role must be either doctor or patient')
];

const loginValidation = [
    body('email')
        .isEmail().withMessage('Valid email is required')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required')
];

module.exports = {
    registerValidation,
    loginValidation
};
