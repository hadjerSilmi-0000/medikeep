const Joi = require('joi');

const createPrescriptionSchema = Joi.object({
    appointment_id: Joi.number().integer().required().messages({
        'number.base': 'Appointment ID must be a number',
        'any.required': 'Appointment ID is required'
    }),
    patient_id: Joi.number().integer().required().messages({
        'number.base': 'Patient ID must be a number',
        'any.required': 'Patient ID is required'
    }),
    medication: Joi.string().min(2).max(255).required().messages({
        'string.empty': 'Medication name is required',
        'string.min': 'Medication name must be at least 2 characters',
        'string.max': 'Medication name cannot exceed 255 characters',
        'any.required': 'Medication name is required'
    }),
    dosage: Joi.string().min(1).max(100).required().messages({
        'string.empty': 'Dosage is required',
        'string.min': 'Dosage must be specified',
        'string.max': 'Dosage cannot exceed 100 characters',
        'any.required': 'Dosage is required'
    }),
    notes: Joi.string().max(1000).optional().allow('').messages({
        'string.max': 'Notes cannot exceed 1000 characters'
    })
});

const updatePrescriptionSchema = Joi.object({
    medication: Joi.string().min(2).max(255).optional().messages({
        'string.empty': 'Medication name cannot be empty',
        'string.min': 'Medication name must be at least 2 characters',
        'string.max': 'Medication name cannot exceed 255 characters'
    }),
    dosage: Joi.string().min(1).max(100).optional().messages({
        'string.empty': 'Dosage cannot be empty',
        'string.min': 'Dosage must be specified',
        'string.max': 'Dosage cannot exceed 100 characters'
    }),
    notes: Joi.string().max(1000).optional().allow('').messages({
        'string.max': 'Notes cannot exceed 1000 characters'
    })
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
});

const prescriptionParamsSchema = Joi.object({
    prescription_id: Joi.number().integer().required().messages({
        'number.base': 'Prescription ID must be a number',
        'any.required': 'Prescription ID is required'
    })
});

const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
        'number.base': 'Page must be a number',
        'number.integer': 'Page must be an integer',
        'number.min': 'Page must be at least 1'
    }),
    limit: Joi.number().integer().min(1).max(100).default(10).messages({
        'number.base': 'Limit must be a number',
        'number.integer': 'Limit must be an integer',
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
    }),
    sortBy: Joi.string().valid('created_at', 'medication', 'doctor_name').default('created_at').messages({
        'any.only': 'Sort field must be one of: created_at, medication, doctor_name'
    }),
    order: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').default('DESC').messages({
        'any.only': 'Order must be ASC or DESC'
    })
});

module.exports = {
    createPrescriptionSchema,
    updatePrescriptionSchema,
    prescriptionParamsSchema,
    paginationSchema
};
