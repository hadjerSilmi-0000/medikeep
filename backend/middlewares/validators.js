const { body, validationResult } = require('express-validator');
const Joi = require('joi');

// Joi-based validation function for schema validation
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        let dataToValidate;

        switch (source) {
            case 'body':
                dataToValidate = req.body;
                break;
            case 'params':
                dataToValidate = req.params;
                break;
            case 'query':
                dataToValidate = req.query;
                break;
            case 'headers':
                dataToValidate = req.headers;
                break;
            default:
                dataToValidate = req.body;
        }

        const { error, value } = schema.validate(dataToValidate, {
            abortEarly: false, // Show all validation errors
            allowUnknown: false, // Don't allow unknown fields
            stripUnknown: true // Remove unknown fields
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        // Replace the original data with validated data (with defaults applied)
        switch (source) {
            case 'body':
                req.body = value;
                break;
            case 'params':
                req.params = value;
                break;
            case 'query':
                req.query = value;
                break;
            case 'headers':
                req.headers = value;
                break;
        }

        next();
    };
};

// Express-validator wrapper function for validation arrays
const validateExpressValidator = (validations) => {
    return async (req, res, next) => {
        // Run all validations
        await Promise.all(validations.map(validation => validation.run(req)));

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(error => ({
                field: error.path || error.param,
                message: error.msg,
                value: error.value
            }))
        });
    };
};

// Joi Schemas
const bookAppointmentSchema = Joi.object({
    doctor_id: Joi.number().integer().positive().required().messages({
        'number.base': 'Doctor ID must be a number',
        'number.integer': 'Doctor ID must be an integer',
        'number.positive': 'Doctor ID must be a positive integer',
        'any.required': 'Doctor ID is required'
    }),
    date_time: Joi.date().iso().required().messages({
        'date.base': 'Valid date_time is required',
        'date.format': 'Date must be in ISO format',
        'any.required': 'Date and time is required'
    }),
    reason: Joi.string().min(5).required().messages({
        'string.min': 'Reason must be at least 5 characters long',
        'any.required': 'Reason is required'
    })
});

const registerSchema = Joi.object({
    name: Joi.string().trim().min(1).required().messages({
        'string.empty': 'Name is required',
        'any.required': 'Name is required'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'Invalid email format',
        'any.required': 'Email is required'
    }),
    password: Joi.string()
        .min(8)
        .pattern(/[0-9]/)
        .pattern(/[!@#$%^&*(),.?":{}|<>]/)
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters',
            'string.pattern.base': 'Password must contain at least one number and one symbol',
            'any.required': 'Password is required'
        }),
    role: Joi.string().valid('doctor', 'patient').required().messages({
        'any.only': 'Role must be either doctor or patient',
        'any.required': 'Role is required'
    })
});

const resetPasswordSchema = Joi.object({
    password: Joi.string()
        .min(8)
        .pattern(/[0-9]/)
        .pattern(/[!@#$%^&*(),.?":{}|<>]/)
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters',
            'string.pattern.base': 'Password must contain at least one number and one symbol',
            'any.required': 'Password is required'
        })
});

// Express-validator validation arrays 
const registerValidation = [
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

const resetPasswordValidation = [
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[0-9]/).withMessage('Password must contain a number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain a symbol')
];

const bookAppointmentValidation = [
    body('doctor_id')
        .isInt({ gt: 0 }).withMessage('Doctor ID must be a positive integer'),
    body('date_time')
        .isISO8601().withMessage('Valid date_time is required'),
    body('reason')
        .isLength({ min: 5 }).withMessage('Reason must be at least 5 characters long')
];

module.exports = {
    // Joi validation
    validate,
    bookAppointmentSchema,
    registerSchema,
    resetPasswordSchema,

    // Express-validator
    validateExpressValidator,
    registerValidation,
    resetPasswordValidation,
    bookAppointmentValidation
};