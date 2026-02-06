/**
 * Error module exports
 * Centralized export point for all error-related utilities
 */

export {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from './AppError.js';

export {
  ErrorCodes,
  AUTH_ERRORS,
  USER_ERRORS,
  POST_ERRORS,
  COMMENT_ERRORS,
  LIKE_ERRORS,
  MEDIA_ERRORS,
  LOCATION_ERRORS,
  NOTIFICATION_ERRORS,
  VALIDATION_ERRORS,
  SERVER_ERRORS,
} from './errorCodes.js';
