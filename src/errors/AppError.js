/**
 * Custom Application Error class
 * Provides structured error handling with error codes and HTTP status
 */
export class AppError extends Error {
  /**
   * @param {string} code - Error code identifier
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code
   * @param {any} data - Additional error data (optional)
   */
  constructor(code, message, statusCode = 500, data = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.data = data;
    this.isOperational = true; // Distinguishes operational errors from programming errors

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create AppError from ErrorCode object
   * @param {Object} errorCode - Error code definition from errorCodes.js
   * @param {any} data - Additional error data (optional)
   * @returns {AppError}
   */
  static fromCode(errorCode, data = null) {
    return new AppError(errorCode.code, errorCode.message, errorCode.status, data);
  }

  /**
   * Convert error to JSON response format
   * @returns {Object}
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.data && { data: this.data }),
    };
  }
}

/**
 * Validation Error - extends AppError for validation-specific errors
 */
export class ValidationError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {Object} errors - Validation error details (field -> messages)
   */
  constructor(message, errors = {}) {
    super('VALIDATION_ERROR', message, 400, errors);
    this.name = 'ValidationError';
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends AppError {
  /**
   * @param {string} resource - Name of the resource not found
   */
  constructor(resource = 'Resource') {
    super('NOT_FOUND', `${resource}을(를) 찾을 수 없습니다`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Unauthorized Error - for authentication failures
 */
export class UnauthorizedError extends AppError {
  /**
   * @param {string} message - Custom message (optional)
   */
  constructor(message = '인증이 필요합니다') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden Error - for authorization failures
 */
export class ForbiddenError extends AppError {
  /**
   * @param {string} message - Custom message (optional)
   */
  constructor(message = '권한이 없습니다') {
    super('FORBIDDEN', message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Conflict Error - for duplicate resources
 */
export class ConflictError extends AppError {
  /**
   * @param {string} message - Custom message
   */
  constructor(message = '이미 존재하는 리소스입니다') {
    super('CONFLICT', message, 409);
    this.name = 'ConflictError';
  }
}

export default AppError;
