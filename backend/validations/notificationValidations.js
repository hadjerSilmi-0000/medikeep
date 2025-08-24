// validations/notificationValidations.js
const Joi = require('joi');

// Validation for creating a notification
const createNotificationSchema = Joi.object({
    userId: Joi.alternatives().try(
        Joi.number().integer().positive(),
        Joi.string().min(1)
    ).required()
        .messages({
            'any.required': 'User ID is required',
            'number.positive': 'User ID must be positive',
            'string.empty': 'User ID cannot be empty'
        }),

    type: Joi.string()
        .valid('appointment', 'prescription', 'reminder', 'system', 'general')
        .required()
        .messages({
            'any.required': 'Notification type is required',
            'any.only': 'Type must be one of: appointment, prescription, reminder, system, general'
        }),

    title: Joi.string()
        .min(3)
        .max(100)
        .required()
        .messages({
            'any.required': 'Title is required',
            'string.min': 'Title must be at least 3 characters long',
            'string.max': 'Title cannot exceed 100 characters'
        }),

    body: Joi.string()
        .min(10)
        .max(500)
        .required()
        .messages({
            'any.required': 'Body is required',
            'string.min': 'Body must be at least 10 characters long',
            'string.max': 'Body cannot exceed 500 characters'
        }),

    data: Joi.object().optional()
        .messages({
            'object.base': 'Data must be a valid object'
        }),

    sendEmail: Joi.boolean().optional().default(false),

    userEmail: Joi.when('sendEmail', {
        is: true,
        then: Joi.string().email().required()
            .messages({
                'any.required': 'User email is required when sendEmail is true',
                'string.email': 'Please provide a valid email address'
            }),
        otherwise: Joi.string().email().optional()
    })
});

// Validation for pagination parameters
const paginationSchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .default(1)
        .messages({
            'number.base': 'Page must be a number',
            'number.integer': 'Page must be an integer',
            'number.min': 'Page must be at least 1'
        }),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(50)
        .default(10)
        .messages({
            'number.base': 'Limit must be a number',
            'number.integer': 'Limit must be an integer',
            'number.min': 'Limit must be at least 1',
            'number.max': 'Limit cannot exceed 50'
        }),

    sortBy: Joi.string()
        .valid('id', 'type', 'title', 'created_at', 'is_read')
        .default('created_at')
        .messages({
            'any.only': 'Sort by must be one of: id, type, title, created_at, is_read'
        }),

    order: Joi.string()
        .valid('ASC', 'DESC', 'asc', 'desc')
        .default('DESC')
        .messages({
            'any.only': 'Order must be either ASC or DESC'
        })
});

// Validation for notification ID parameter
const notificationIdSchema = Joi.object({
    id: Joi.alternatives().try(
        Joi.number().integer().positive(),
        Joi.string().pattern(/^\d+$/)
    ).required()
        .messages({
            'any.required': 'Notification ID is required',
            'number.positive': 'Notification ID must be positive',
            'string.pattern.base': 'Notification ID must be numeric'
        })
});

// Validation for bulk operations
const bulkOperationSchema = Joi.object({
    notificationIds: Joi.array()
        .items(
            Joi.alternatives().try(
                Joi.number().integer().positive(),
                Joi.string().pattern(/^\d+$/)
            )
        )
        .min(1)
        .max(100)
        .required()
        .messages({
            'any.required': 'Notification IDs are required',
            'array.min': 'At least one notification ID is required',
            'array.max': 'Cannot process more than 100 notifications at once'
        })
});

// Validation middleware functions
const validateCreateNotification = (req, res, next) => {
    const { error, value } = createNotificationSchema.validate(req.body, {
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
            message: 'Validation error',
            errors
        });
    }

    req.validatedData = value;
    next();
};

const validatePagination = (req, res, next) => {
    const { error, value } = paginationSchema.validate(req.query, {
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
            message: 'Invalid pagination parameters',
            errors
        });
    }

    req.validatedQuery = value;
    next();
};

const validateNotificationId = (req, res, next) => {
    const { error, value } = notificationIdSchema.validate(req.params, {
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
            message: 'Invalid notification ID',
            errors
        });
    }

    req.validatedParams = value;
    next();
};

const validateBulkOperation = (req, res, next) => {
    const { error, value } = bulkOperationSchema.validate(req.body, {
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
            message: 'Invalid bulk operation data',
            errors
        });
    }

    req.validatedData = value;
    next();
};

module.exports = {
    // Schemas
    createNotificationSchema,
    paginationSchema,
    notificationIdSchema,
    bulkOperationSchema,

    // Middleware functions
    validateCreateNotification,
    validatePagination,
    validateNotificationId,
    validateBulkOperation
};