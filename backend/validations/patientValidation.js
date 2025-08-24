const Joi = require('joi');

// Update patient profile validation (flexible - all fields optional)
const updateProfileSchema = Joi.object({
    // User fields (optional)
    name: Joi.string().min(2).max(100).trim(),
    email: Joi.string().email().lowercase(),

    // Patient fields (optional)
    birthdate: Joi.date().max('now').iso(),
    gender: Joi.string().valid('male', 'female', 'other').lowercase(),
    phone: Joi.string().pattern(/^[0-9+\-\s()]{10,20}$/).messages({
        'string.pattern.base': 'Phone number must be valid (10-20 digits, can include +, -, spaces, parentheses)'
    }),
    address: Joi.string().min(10).max(500).trim()
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
});

// Complete patient profile validation (required fields for profile completion)
const completeProfileSchema = Joi.object({
    // User fields (optional updates)
    name: Joi.string().min(2).max(100).trim(),
    email: Joi.string().email().lowercase(),

    // Patient fields (required for completion)
    birthdate: Joi.date().max('now').iso().required(),
    gender: Joi.string().valid('male', 'female', 'other').lowercase().required(),
    phone: Joi.string().pattern(/^[0-9+\-\s()]{10,20}$/).required().messages({
        'string.pattern.base': 'Phone number must be valid (10-20 digits, can include +, -, spaces, parentheses)'
    }),
    address: Joi.string().min(10).max(500).trim().required()
});

// Search doctors validation
const searchDoctorsSchema = Joi.object({
    name: Joi.string().max(100).trim().allow('').default(''),
    specialty: Joi.string().max(100).trim().allow('').default(''),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10)
});

// Validation middleware functions
const validateUpdateProfile = (req, res, next) => {
    const { error, value } = updateProfileSchema.validate(req.body);

    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
        });
    }

    req.body = value; // Use validated data
    next();
};

const validateCompleteProfile = (req, res, next) => {
    const { error, value } = completeProfileSchema.validate(req.body);

    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
        });
    }

    req.body = value; // Use validated data
    next();
};

const validateSearchDoctors = (req, res, next) => {
    const { error, value } = searchDoctorsSchema.validate(req.query);

    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Invalid search parameters',
            errors: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
        });
    }

    req.query = value; // Use validated data with defaults
    next();
};

// Additional validation schemas for future use
const patientIdParamSchema = Joi.object({
    id: Joi.string().uuid().required().messages({
        'string.uuid': 'Patient ID must be a valid UUID'
    })
});

// Validate patient ID in URL parameters
const validatePatientIdParam = (req, res, next) => {
    const { error, value } = patientIdParamSchema.validate(req.params);

    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Invalid patient ID',
            errors: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
        });
    }

    req.params = value;
    next();
};

// Export validation schemas and middleware
module.exports = {
    // Schemas
    updateProfileSchema,
    completeProfileSchema,
    searchDoctorsSchema,
    patientIdParamSchema,

    // Middleware functions
    validateUpdateProfile,
    validateCompleteProfile,
    validateSearchDoctors,
    validatePatientIdParam
};