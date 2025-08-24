const Joi = require('joi');

// Book appointment validation (for patients)
const bookAppointmentSchema = Joi.object({
    doctor_id: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Doctor ID must be a number',
            'number.positive': 'Doctor ID must be positive',
            'any.required': 'Doctor ID is required'
        }),
    date_time: Joi.date().min('now').required()
        .messages({
            'date.base': 'Date and time must be a valid date',
            'date.min': 'Appointment date must be in the future',
            'any.required': 'Date and time is required'
        }),
    reason: Joi.string().min(10).max(500).required()
        .messages({
            'string.min': 'Reason must be at least 10 characters long',
            'string.max': 'Reason cannot exceed 500 characters',
            'any.required': 'Reason is required'
        })
});

// Give appointment validation (for doctors)
const giveAppointmentSchema = Joi.object({
    patient_id: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Patient user ID must be a number',
            'number.positive': 'Patient user ID must be positive',
            'any.required': 'Patient user ID is required'
        }),
    date_time: Joi.date().min('now').required()
        .messages({
            'date.base': 'Date and time must be a valid date',
            'date.min': 'Appointment date must be in the future',
            'any.required': 'Date and time is required'
        }),
    reason: Joi.string().min(5).max(500).optional()
        .messages({
            'string.min': 'Reason must be at least 5 characters long',
            'string.max': 'Reason cannot exceed 500 characters'
        })
});

// Update appointment status validation
const updateStatusSchema = Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'completed', 'cancelled').required()
        .messages({
            'any.only': 'Status must be one of: pending, confirmed, completed, cancelled',
            'any.required': 'Status is required'
        })
});

// Query parameters validation for getting appointments
const getAppointmentsSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1)
        .messages({
            'number.base': 'Page must be a number',
            'number.min': 'Page must be at least 1'
        }),
    limit: Joi.number().integer().min(1).max(100).default(10)
        .messages({
            'number.base': 'Limit must be a number',
            'number.min': 'Limit must be at least 1',
            'number.max': 'Limit cannot exceed 100'
        }),
    sortBy: Joi.string().valid('date_time', 'status', 'created_at').default('date_time')
        .messages({
            'any.only': 'Sort by must be one of: date_time, status, created_at'
        }),
    order: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').default('DESC')
        .messages({
            'any.only': 'Order must be ASC or DESC'
        }),
    status: Joi.string().valid('pending', 'confirmed', 'completed', 'cancelled').optional()
        .messages({
            'any.only': 'Status filter must be one of: pending, confirmed, completed, cancelled'
        }),
    date_from: Joi.date().optional()
        .messages({
            'date.base': 'Date from must be a valid date'
        }),
    date_to: Joi.date().optional().when('date_from', {
        is: Joi.exist(),
        then: Joi.date().min(Joi.ref('date_from'))
            .messages({
                'date.min': 'Date to must be after date from'
            })
    })
        .messages({
            'date.base': 'Date to must be a valid date'
        }),
    search: Joi.string().min(2).max(50).optional()
        .messages({
            'string.min': 'Search term must be at least 2 characters',
            'string.max': 'Search term cannot exceed 50 characters'
        }),
    specialty: Joi.string().min(2).max(50).optional()
        .messages({
            'string.min': 'Specialty must be at least 2 characters',
            'string.max': 'Specialty cannot exceed 50 characters'
        }),
    upcoming: Joi.boolean().optional()
        .messages({
            'boolean.base': 'Upcoming must be true or false'
        }),
    past: Joi.boolean().optional()
        .messages({
            'boolean.base': 'Past must be true or false'
        })
});

// ID parameter validation
const appointmentIdSchema = Joi.object({
    id: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Appointment ID must be a number',
            'number.positive': 'Appointment ID must be positive',
            'any.required': 'Appointment ID is required'
        })
});

module.exports = {
    bookAppointmentSchema,
    giveAppointmentSchema,
    updateStatusSchema,
    getAppointmentsSchema,
    appointmentIdSchema
};