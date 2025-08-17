// Error handling utilities

/**
 * Custom application error class
 */
class AppError extends Error {
    constructor(message, statusCode = 500, code = null, details = null) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;
        
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            statusCode: this.statusCode,
            code: this.code,
            details: this.details,
            stack: this.stack
        };
    }
}

/**
 * Validation error class
 */
class ValidationError extends AppError {
    constructor(message, field = null, value = null) {
        super(message, 400, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
        this.field = field;
        this.value = value;
    }
}

/**
 * Database error class
 */
class DatabaseError extends AppError {
    constructor(message, originalError = null) {
        super(message, 500, 'DATABASE_ERROR');
        this.name = 'DatabaseError';
        this.originalError = originalError;
    }
}

/**
 * Authentication error class
 */
class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, 'AUTHENTICATION_ERROR');
        this.name = 'AuthenticationError';
    }
}

/**
 * Authorization error class
 */
class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions') {
        super(message, 403, 'AUTHORIZATION_ERROR');
        this.name = 'AuthorizationError';
    }
}

/**
 * Not found error class
 */
class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
        this.name = 'NotFoundError';
        this.resource = resource;
    }
}

/**
 * Conflict error class
 */
class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409, 'CONFLICT_ERROR');
        this.name = 'ConflictError';
    }
}

/**
 * Business logic error class
 */
class BusinessLogicError extends AppError {
    constructor(message, code = null) {
        super(message, 422, code || 'BUSINESS_LOGIC_ERROR');
        this.name = 'BusinessLogicError';
    }
}

/**
 * Rate limit error class
 */
class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded') {
        super(message, 429, 'RATE_LIMIT_ERROR');
        this.name = 'RateLimitError';
    }
}

/**
 * Error handler middleware
 */
function errorHandler(err, req, res, next) {
    let error = { ...err };
    error.message = err.message;

    // Log error
    console.error(err);

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Resource not found';
        error = new NotFoundError(message);
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = new ConflictError(message);
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = new ValidationError(message);
    }

    // Supabase errors
    if (err.code) {
        switch (err.code) {
            case 'PGRST116':
                error = new NotFoundError();
                break;
            case '23505': // Unique violation
                error = new ConflictError('Duplicate entry');
                break;
            case '23503': // Foreign key violation
                error = new BusinessLogicError('Referenced resource does not exist');
                break;
            case '23514': // Check violation
                error = new ValidationError('Data violates constraints');
                break;
            default:
                if (err.message) {
                    error = new DatabaseError(err.message, err);
                }
        }
    }

    // Default to 500 server error
    if (!error.statusCode) {
        error = new AppError('Internal server error', 500);
    }

    res.status(error.statusCode || 500).json({
        success: false,
        error: {
            message: error.message || 'Internal server error',
            code: error.code,
            details: error.details,
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        }
    });
}

/**
 * Async error handler wrapper
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Handle unhandled promise rejections
 */
function handleUnhandledRejection() {
    process.on('unhandledRejection', (err, promise) => {
        console.log('Unhandled Promise Rejection:', err.message);
        console.log('Shutting down the server due to unhandled promise rejection');
        process.exit(1);
    });
}

/**
 * Handle uncaught exceptions
 */
function handleUncaughtException() {
    process.on('uncaughtException', (err) => {
        console.log('Uncaught Exception:', err.message);
        console.log('Shutting down the server due to uncaught exception');
        process.exit(1);
    });
}

/**
 * Create error response
 */
function createErrorResponse(message, statusCode = 500, code = null, details = null) {
    return {
        success: false,
        error: {
            message,
            code,
            details,
            statusCode
        }
    };
}

/**
 * Create success response
 */
function createSuccessResponse(data = null, message = 'Success', meta = null) {
    const response = {
        success: true,
        message
    };

    if (data !== null) {
        response.data = data;
    }

    if (meta !== null) {
        response.meta = meta;
    }

    return response;
}

/**
 * Validate and throw error if validation fails
 */
function validateAndThrow(condition, message, statusCode = 400) {
    if (!condition) {
        throw new AppError(message, statusCode);
    }
}

/**
 * Handle Supabase errors
 */
function handleSupabaseError(error, context = '') {
    if (!error) return null;

    const contextMessage = context ? `${context}: ` : '';

    switch (error.code) {
        case 'PGRST116':
            throw new NotFoundError();
        case '23505':
            throw new ConflictError(`${contextMessage}Duplicate entry`);
        case '23503':
            throw new BusinessLogicError(`${contextMessage}Referenced resource does not exist`);
        case '23514':
            throw new ValidationError(`${contextMessage}Data violates constraints`);
        case '42501':
            throw new AuthorizationError(`${contextMessage}Insufficient permissions`);
        default:
            throw new DatabaseError(`${contextMessage}${error.message}`, error);
    }
}

/**
 * Error codes enum
 */
const ERROR_CODES = {
    // Authentication & Authorization
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    
    // Validation
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
    INVALID_FORMAT: 'INVALID_FORMAT',
    INVALID_VALUE: 'INVALID_VALUE',
    
    // Business Logic
    DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    INVALID_OPERATION: 'INVALID_OPERATION',
    BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
    
    // System
    DATABASE_ERROR: 'DATABASE_ERROR',
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
};

module.exports = {
    AppError,
    ValidationError,
    DatabaseError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    BusinessLogicError,
    RateLimitError,
    errorHandler,
    asyncHandler,
    handleUnhandledRejection,
    handleUncaughtException,
    createErrorResponse,
    createSuccessResponse,
    validateAndThrow,
    handleSupabaseError,
    ERROR_CODES
};