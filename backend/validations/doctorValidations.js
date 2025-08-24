const Joi = require('joi');

// Add patient validation schema
const addPatientSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(50)
        .pattern(/^[a-zA-Z\s]+$/)
        .required()
        .messages({
            'string.min': 'Name must be at least 2 characters long',
            'string.max': 'Name cannot exceed 50 characters',
            'string.pattern.base': 'Name can only contain letters and spaces',
            'any.required': 'Name is required'
        }),

    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),

    birthdate: Joi.date()
        .max('now')
        .required()
        .messages({
            'date.max': 'Birthdate cannot be in the future',
            'any.required': 'Birthdate is required'
        }),

    gender: Joi.string()
        .valid('male', 'female', 'other')
        .required()
        .messages({
            'any.only': 'Gender must be either male, female, or other',
            'any.required': 'Gender is required'
        }),

    phone: Joi.string()
        .pattern(/^[0-9+\-\s()]+$/)
        .min(10)
        .max(20)
        .required()
        .messages({
            'string.pattern.base': 'Phone number can only contain numbers, +, -, spaces, and parentheses',
            'string.min': 'Phone number must be at least 10 characters long',
            'string.max': 'Phone number cannot exceed 20 characters',
            'any.required': 'Phone number is required'
        }),

    address: Joi.string()
        .min(10)
        .max(200)
        .required()
        .messages({
            'string.min': 'Address must be at least 10 characters long',
            'string.max': 'Address cannot exceed 200 characters',
            'any.required': 'Address is required'
        })
});

// Edit patient validation schema
const editPatientSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(50)
        .pattern(/^[a-zA-Z\s]+$/)
        .optional()
        .messages({
            'string.min': 'Name must be at least 2 characters long',
            'string.max': 'Name cannot exceed 50 characters',
            'string.pattern.base': 'Name can only contain letters and spaces'
        }),

    email: Joi.string()
        .email()
        .optional()
        .messages({
            'string.email': 'Please provide a valid email address'
        }),

    birthdate: Joi.date()
        .max('now')
        .optional()
        .messages({
            'date.max': 'Birthdate cannot be in the future'
        }),

    gender: Joi.string()
        .valid('male', 'female', 'other')
        .optional()
        .messages({
            'any.only': 'Gender must be either male, female, or other'
        }),

    phone: Joi.string()
        .pattern(/^[0-9+\-\s()]+$/)
        .min(10)
        .max(20)
        .optional()
        .messages({
            'string.pattern.base': 'Phone number can only contain numbers, +, -, spaces, and parentheses',
            'string.min': 'Phone number must be at least 10 characters long',
            'string.max': 'Phone number cannot exceed 20 characters'
        }),

    address: Joi.string()
        .min(10)
        .max(200)
        .optional()
        .messages({
            'string.min': 'Address must be at least 10 characters long',
            'string.max': 'Address cannot exceed 200 characters'
        })
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
});

// Patient list query parameters validation
const getLinkedPatientsSchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .optional()
        .default(1)
        .messages({
            'number.base': 'Page must be a number',
            'number.integer': 'Page must be an integer',
            'number.min': 'Page must be at least 1'
        }),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .optional()
        .default(10)
        .messages({
            'number.base': 'Limit must be a number',
            'number.integer': 'Limit must be an integer',
            'number.min': 'Limit must be at least 1',
            'number.max': 'Limit cannot exceed 100'
        }),

    search: Joi.string()
        .max(100)
        .optional()
        .allow('')
        .messages({
            'string.max': 'Search term cannot exceed 100 characters'
        }),

    gender: Joi.string()
        .valid('male', 'female', 'other')
        .optional()
        .messages({
            'any.only': 'Gender filter must be either male, female, or other'
        }),

    ageMin: Joi.number()
        .integer()
        .min(0)
        .max(150)
        .optional()
        .messages({
            'number.base': 'Minimum age must be a number',
            'number.integer': 'Minimum age must be an integer',
            'number.min': 'Minimum age cannot be negative',
            'number.max': 'Minimum age cannot exceed 150'
        }),

    ageMax: Joi.number()
        .integer()
        .min(0)
        .max(150)
        .optional()
        .when('ageMin', {
            is: Joi.exist(),
            then: Joi.number().min(Joi.ref('ageMin')),
            otherwise: Joi.number()
        })
        .messages({
            'number.base': 'Maximum age must be a number',
            'number.integer': 'Maximum age must be an integer',
            'number.min': 'Maximum age must be greater than or equal to minimum age',
            'number.max': 'Maximum age cannot exceed 150'
        }),

    sortBy: Joi.string()
        .valid('name', 'birthdate', 'linked_at')
        .optional()
        .default('name')
        .messages({
            'any.only': 'Sort field must be one of: name, birthdate, linked_at'
        }),

    sortOrder: Joi.string()
        .valid('asc', 'desc')
        .optional()
        .default('asc')
        .messages({
            'any.only': 'Sort order must be either asc or desc'
        })
});

// Patient user ID parameter validation
const patientUserIdSchema = Joi.object({
    patientUserId: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'Patient user ID must be a number',
            'number.integer': 'Patient user ID must be an integer',
            'number.positive': 'Patient user ID must be positive',
            'any.required': 'Patient user ID is required'
        })
});

// Doctor profile validation schema (for future use)
const createDoctorProfileSchema = Joi.object({
    specialty: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': 'Specialty must be at least 2 characters long',
            'string.max': 'Specialty cannot exceed 100 characters',
            'any.required': 'Specialty is required'
        }),

    bio: Joi.string()
        .min(10)
        .max(1000)
        .optional()
        .messages({
            'string.min': 'Bio must be at least 10 characters long',
            'string.max': 'Bio cannot exceed 1000 characters'
        }),

    phone: Joi.string()
        .pattern(/^[0-9+\-\s()]+$/)
        .min(10)
        .max(20)
        .required()
        .messages({
            'string.pattern.base': 'Phone number can only contain numbers, +, -, spaces, and parentheses',
            'string.min': 'Phone number must be at least 10 characters long',
            'string.max': 'Phone number cannot exceed 20 characters',
            'any.required': 'Phone number is required'
        })
});

// Update doctor profile validation schema (for future use)
const updateDoctorProfileSchema = Joi.object({
    specialty: Joi.string()
        .min(2)
        .max(100)
        .optional()
        .messages({
            'string.min': 'Specialty must be at least 2 characters long',
            'string.max': 'Specialty cannot exceed 100 characters'
        }),

    bio: Joi.string()
        .min(10)
        .max(1000)
        .optional()
        .messages({
            'string.min': 'Bio must be at least 10 characters long',
            'string.max': 'Bio cannot exceed 1000 characters'
        }),

    phone: Joi.string()
        .pattern(/^[0-9+\-\s()]+$/)
        .min(10)
        .max(20)
        .optional()
        .messages({
            'string.pattern.base': 'Phone number can only contain numbers, +, -, spaces, and parentheses',
            'string.min': 'Phone number must be at least 10 characters long',
            'string.max': 'Phone number cannot exceed 20 characters'
        })
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
});

// Doctor list query parameters validation (for future use)
const getDoctorsSchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .optional()
        .default(1)
        .messages({
            'number.base': 'Page must be a number',
            'number.integer': 'Page must be an integer',
            'number.min': 'Page must be at least 1'
        }),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .optional()
        .default(10)
        .messages({
            'number.base': 'Limit must be a number',
            'number.integer': 'Limit must be an integer',
            'number.min': 'Limit must be at least 1',
            'number.max': 'Limit cannot exceed 100'
        }),

    search: Joi.string()
        .max(100)
        .optional()
        .allow('')
        .messages({
            'string.max': 'Search term cannot exceed 100 characters'
        }),

    specialty: Joi.string()
        .max(100)
        .optional()
        .messages({
            'string.max': 'Specialty filter cannot exceed 100 characters'
        }),

    sortBy: Joi.string()
        .valid('name', 'specialty', 'created_at')
        .optional()
        .default('name')
        .messages({
            'any.only': 'Sort field must be one of: name, specialty, created_at'
        }),

    sortOrder: Joi.string()
        .valid('asc', 'desc')
        .optional()
        .default('asc')
        .messages({
            'any.only': 'Sort order must be either asc or desc'
        })
});

// Validation middleware function
const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        // Replace the request property with the validated and sanitized value
        req[property] = value;
        next();
    };
};

module.exports = {
    // Validation schemas
    addPatientSchema,
    editPatientSchema,
    getLinkedPatientsSchema,
    patientUserIdSchema,
    createDoctorProfileSchema,
    updateDoctorProfileSchema,
    getDoctorsSchema,

    // Validation middleware
    validate,

    // Specific middleware functions for common use cases
    validateAddPatient: validate(addPatientSchema, 'body'),
    validateEditPatient: validate(editPatientSchema, 'body'),
    validateGetLinkedPatients: validate(getLinkedPatientsSchema, 'query'),
    validatePatientUserId: validate(patientUserIdSchema, 'params'),
    validateCreateDoctorProfile: validate(createDoctorProfileSchema, 'body'),
    validateUpdateDoctorProfile: validate(updateDoctorProfileSchema, 'body'),
    validateGetDoctors: validate(getDoctorsSchema, 'query')
};