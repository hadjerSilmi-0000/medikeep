const Joi = require('joi');

// Custom sanitization extensions for Joi
const customJoi = Joi.extend((joi) => {
    return {
        type: 'string',
        base: joi.string(),
        messages: {
            'string.sanitize': '{{#label}} contains invalid characters'
        },
        rules: {
            sanitizeName: {
                method() {
                    return this.$_addRule('sanitizeName');
                },
                validate(value, helpers) {
                    // Remove potentially dangerous characters but keep spaces and hyphens
                    const sanitized = value
                        .replace(/[<>\"'%;()&+]/g, '') // Remove dangerous chars
                        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                        .trim();

                    return sanitized;
                }
            },
            sanitizeEmail: {
                method() {
                    return this.$_addRule('sanitizeEmail');
                },
                validate(value, helpers) {
                    // Basic email sanitization
                    return value.toLowerCase().trim();
                }
            }
        }
    };
});

// Enhanced Joi validation schemas with sanitization
const registerSchema = customJoi.object({
    name: customJoi.string()
        .min(2)
        .max(50)
        .sanitizeName()
        .pattern(/^[a-zA-Z\s\-']+$/) // Only letters, spaces, hyphens, apostrophes
        .required()
        .messages({
            'string.min': 'Name must be at least 2 characters',
            'string.max': 'Name must not exceed 50 characters',
            'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes',
            'any.required': 'Name is required'
        }),
    email: customJoi.string()
        .email()
        .sanitizeEmail()
        .max(100)
        .required()
        .messages({
            'string.email': 'Valid email is required',
            'string.max': 'Email must not exceed 100 characters',
            'any.required': 'Email is required'
        }),
    password: customJoi.string()
        .min(8)
        .max(128) // Prevent extremely long passwords
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])'))
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters',
            'string.max': 'Password must not exceed 128 characters',
            'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&)',
            'any.required': 'Password is required'
        }),
    role: customJoi.string()
        .valid('doctor', 'patient', 'admin')
        .required()
        .messages({
            'any.only': 'Role must be either doctor, patient',
            'any.required': 'Role is required'
        })
});

const loginSchema = customJoi.object({
    email: customJoi.string()
        .email()
        .sanitizeEmail()
        .max(100)
        .required()
        .messages({
            'string.email': 'Valid email is required',
            'string.max': 'Email must not exceed 100 characters',
            'any.required': 'Email is required'
        }),
    password: customJoi.string()
        .min(1)
        .max(128)
        .required()
        .messages({
            'string.min': 'Password is required',
            'string.max': 'Password must not exceed 128 characters',
            'any.required': 'Password is required'
        })
});

const forgotPasswordSchema = customJoi.object({
    email: customJoi.string()
        .email()
        .sanitizeEmail()
        .max(100)
        .required()
        .messages({
            'string.email': 'Valid email is required',
            'string.max': 'Email must not exceed 100 characters',
            'any.required': 'Email is required'
        })
});

const resetPasswordSchema = customJoi.object({
    token: customJoi.string()
        .alphanum() // Only alphanumeric characters
        .length(64) // Specific length for security tokens
        .required()
        .messages({
            'string.alphanum': 'Invalid token format',
            'string.length': 'Invalid token length',
            'any.required': 'Reset token is required'
        }),
    password: customJoi.string()
        .min(8)
        .max(128)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])'))
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters',
            'string.max': 'Password must not exceed 128 characters',
            'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&)',
            'any.required': 'Password is required'
        })
});

// Enhanced middleware with sanitization and validation
const validateRequest = (schema) => {
    return (req, res, next) => {
        // Validation options with sanitization
        const options = {
            abortEarly: false,
            allowUnknown: false, // Reject unknown fields
            stripUnknown: true,  // Remove unknown fields
            convert: true        // Type conversion
        };

        const { error, value } = schema.validate(req.body, options);

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value ? '[HIDDEN]' : undefined // Hide sensitive values
            }));

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors
            });
        }

        // Replace req.body with sanitized values
        req.body = value;
        next();
    };
};

// Export middleware functions with same names as before to avoid breaking your routes
const registerValidation = validateRequest(registerSchema);
const loginValidation = validateRequest(loginSchema);
const forgotPasswordValidation = validateRequest(forgotPasswordSchema);
const resetPasswordValidation = validateRequest(resetPasswordSchema);

module.exports = {
    registerValidation,
    loginValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
    schemas: {
        registerSchema,
        loginSchema,
        forgotPasswordSchema,
        resetPasswordSchema
    }
};