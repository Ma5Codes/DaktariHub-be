// utils/apiResponse.js

/**
 * Standard API Response Structure
 * 
 * Success Response:
 * {
 *   success: true,
 *   message: string,
 *   data: any,
 *   meta?: { pagination, total, etc. }
 * }
 * 
 * Error Response:
 * {
 *   success: false,
 *   message: string,
 *   error: {
 *     type: string,
 *     details: any
 *   }
 * }
 */

export class ApiResponse {
  /**
   * Success response
   * @param {string} message - Success message
   * @param {*} data - Response data
   * @param {Object} meta - Additional metadata (pagination, etc.)
   * @returns {Object} Formatted success response
   */
  static success(message, data = null, meta = null) {
    const response = {
      success: true,
      message,
      data
    };

    if (meta) {
      response.meta = meta;
    }

    return response;
  }

  /**
   * Error response
   * @param {string} message - Error message
   * @param {string} errorType - Type of error
   * @param {*} details - Error details
   * @returns {Object} Formatted error response
   */
  static error(message, errorType = 'GENERIC_ERROR', details = null) {
    return {
      success: false,
      message,
      error: {
        type: errorType,
        details
      }
    };
  }

  /**
   * Validation error response
   * @param {Array} validationErrors - Array of validation errors
   * @returns {Object} Formatted validation error response
   */
  static validationError(validationErrors) {
    return {
      success: false,
      message: 'Validation failed',
      error: {
        type: 'VALIDATION_ERROR',
        details: validationErrors
      }
    };
  }

  /**
   * Not found error response
   * @param {string} resource - Resource that was not found
   * @returns {Object} Formatted not found error response
   */
  static notFound(resource = 'Resource') {
    return {
      success: false,
      message: `${resource} not found`,
      error: {
        type: 'NOT_FOUND',
        details: null
      }
    };
  }

  /**
   * Unauthorized error response
   * @param {string} message - Custom unauthorized message
   * @returns {Object} Formatted unauthorized error response
   */
  static unauthorized(message = 'Access denied') {
    return {
      success: false,
      message,
      error: {
        type: 'UNAUTHORIZED',
        details: null
      }
    };
  }

  /**
   * Forbidden error response
   * @param {string} message - Custom forbidden message
   * @returns {Object} Formatted forbidden error response
   */
  static forbidden(message = 'Forbidden') {
    return {
      success: false,
      message,
      error: {
        type: 'FORBIDDEN',
        details: null
      }
    };
  }

  /**
   * Conflict error response
   * @param {string} message - Custom conflict message
   * @returns {Object} Formatted conflict error response
   */
  static conflict(message = 'Conflict') {
    return {
      success: false,
      message,
      error: {
        type: 'CONFLICT',
        details: null
      }
    };
  }

  /**
   * Server error response
   * @param {string} message - Custom server error message
   * @param {*} details - Error details (for development)
   * @returns {Object} Formatted server error response
   */
  static serverError(message = 'Internal server error', details = null) {
    return {
      success: false,
      message,
      error: {
        type: 'SERVER_ERROR',
        details: process.env.NODE_ENV === 'development' ? details : null
      }
    };
  }

  /**
   * Paginated success response
   * @param {string} message - Success message
   * @param {Array} data - Array of data
   * @param {Object} pagination - Pagination info
   * @returns {Object} Formatted paginated response
   */
  static paginated(message, data, pagination) {
    return {
      success: true,
      message,
      data,
      meta: {
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          pages: Math.ceil(pagination.total / pagination.limit),
          hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
          hasPrev: pagination.page > 1
        }
      }
    };
  }
}