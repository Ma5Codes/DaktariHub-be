// utils/errorHandler.js
import { ApiResponse } from './apiResponse.js';

/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, errorType = 'GENERIC_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
  constructor(validationErrors) {
    super('Validation failed', 400, 'VALIDATION_ERROR', validationErrors);
  }
}

/**
 * Resource not found error class
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/**
 * Unauthorized error class
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Forbidden error class
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Conflict error class
 */
export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Handle Mongoose validation errors
 */
const handleValidationError = (error) => {
  const validationErrors = Object.values(error.errors).map(err => ({
    field: err.path,
    message: err.message,
    value: err.value
  }));
  
  return new ValidationError(validationErrors);
};

/**
 * Handle Mongoose duplicate key errors
 */
const handleDuplicateKeyError = (error) => {
  const field = Object.keys(error.keyValue)[0];
  const value = error.keyValue[field];
  
  return new ConflictError(`${field} '${value}' already exists`);
};

/**
 * Handle Mongoose cast errors
 */
const handleCastError = (error) => {
  return new AppError(`Invalid ${error.path}: ${error.value}`, 400, 'CAST_ERROR');
};

/**
 * Handle JWT errors
 */
const handleJWTError = () => {
  return new UnauthorizedError('Invalid token');
};

const handleJWTExpiredError = () => {
  return new UnauthorizedError('Token expired');
};

/**
 * Global error handling middleware
 */
export const globalErrorHandler = (error, req, res, next) => {
  let err = { ...error };
  err.message = error.message;

  // Log error details in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error Details:', {
      message: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query
    });
  }

  // Handle specific error types
  if (error.name === 'ValidationError') {
    err = handleValidationError(error);
  } else if (error.code === 11000) {
    err = handleDuplicateKeyError(error);
  } else if (error.name === 'CastError') {
    err = handleCastError(error);
  } else if (error.name === 'JsonWebTokenError') {
    err = handleJWTError();
  } else if (error.name === 'TokenExpiredError') {
    err = handleJWTExpiredError();
  }

  // Set default error values if not an operational error
  if (!err.isOperational) {
    err.statusCode = err.statusCode || 500;
    err.errorType = err.errorType || 'SERVER_ERROR';
    err.message = err.message || 'Internal server error';
  }

  // Send error response
  res.status(err.statusCode).json(
    ApiResponse.error(err.message, err.errorType, err.details)
  );
};

/**
 * Async error wrapper to catch errors in async functions
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for undefined routes
 */
export const notFound = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};