const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error for debugging
    console.error(`Error: ${err.message}`, err.stack);

    // Joi validation errors
    if (err.isJoi || err.name === 'ValidationError') {
        const message = 'Validation Error';
        const errors = err.details ? err.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
        })) : [];

        return res.status(400).json({
            success: false,
            message,
            errors
        });
    }

    // MySQL errors
    if (err.code) {
        let message = 'Database error';
        let statusCode = 500;

        switch (err.code) {
            case 'ER_DUP_ENTRY':
                message = 'Duplicate entry. Record already exists';
                statusCode = 409;
                break;
            case 'ER_NO_REFERENCED_ROW_2':
                message = 'Referenced record does not exist';
                statusCode = 400;
                break;
            case 'ER_ROW_IS_REFERENCED_2':
                message = 'Cannot delete record. It is referenced by other records';
                statusCode = 400;
                break;
            case 'ER_DATA_TOO_LONG':
                message = 'Data too long for column';
                statusCode = 400;
                break;
            case 'ER_BAD_NULL_ERROR':
                message = 'Required field cannot be null';
                statusCode = 400;
                break;
            case 'ECONNREFUSED':
                message = 'Database connection failed';
                statusCode = 500;
                break;
            default:
                message = 'Database operation failed';
                statusCode = 500;
        }

        return res.status(statusCode).json({
            success: false,
            message,
            ...(process.env.NODE_ENV === 'development' && { error: err.sqlMessage || err.message })
        });
    }

    // JWT/Authentication errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expired'
        });
    }

    // Bcrypt errors
    if (err.message && err.message.includes('bcrypt')) {
        return res.status(500).json({
            success: false,
            message: 'Authentication processing error'
        });
    }

    // Custom application errors
    if (err.statusCode || err.status) {
        return res.status(err.statusCode || err.status).json({
            success: false,
            message: err.message || 'Application error',
            ...(err.data && { data: err.data })
        });
    }

    // Email sending errors
    if (err.message && err.message.includes('email')) {
        return res.status(500).json({
            success: false,
            message: 'Email service error. Please try again later.'
        });
    }

    // File upload errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File size too large'
        });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            success: false,
            message: 'Unexpected file field'
        });
    }

    // Default server error
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && {
            error: err.message,
            stack: err.stack
        })
    });
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Unhandled Promise Rejection: ${err.message}`);
    // Close server & exit process
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.log(`Uncaught Exception: ${err.message}`);
    console.log('Shutting down the server due to uncaught exception');
    process.exit(1);
});

module.exports = errorHandler;