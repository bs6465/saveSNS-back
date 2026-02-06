/**
 * Application-wide constants and configuration
 * Centralized to avoid magic numbers and strings throughout the codebase
 */

// Server configuration
export const APP_CONFIG = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
};

// Pagination defaults
export const PAGINATION = {
  defaultLimit: 50,
  maxLimit: 100,
};

// Location-based query configuration
export const LOCATION = {
  defaultRangeMeters: 5000,
  maxRangeMeters: 10000,
  minRangeMeters: 100,
};

// JWT configuration
export const JWT_CONFIG = {
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '1h',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
};

// Validation rules
export const VALIDATION = {
  password: {
    minLength: 8,
    requireLetter: true,
    requireNumber: true,
  },
  username: {
    minLength: 3,
    maxLength: 50,
  },
  nickname: {
    minLength: 2,
    maxLength: 30,
  },
  contents: {
    minLength: 1,
    maxLength: 5000,
  },
  comment: {
    minLength: 1,
    maxLength: 500,
  },
};

// Notification configuration
export const NOTIFICATION = {
  retentionDays: 30,
  defaultLimit: 20,
};

// File upload configuration
export const FILE_UPLOAD = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  maxFilesPerPost: 10,
};

// Rate limiting configuration
export const RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // limit each IP to 100 requests per windowMs
  authWindowMs: 60 * 60 * 1000, // 1 hour for auth routes
  authMaxRequests: 10, // stricter limit for auth routes
};

// CORS configuration
export const CORS_CONFIG = {
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:8081',
    'http://localhost:19006',
    'exp://localhost:8081',
  ],
  credentials: true,
};

// HTTP status codes (for consistency)
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};

export default {
  APP_CONFIG,
  PAGINATION,
  LOCATION,
  JWT_CONFIG,
  VALIDATION,
  NOTIFICATION,
  FILE_UPLOAD,
  RATE_LIMIT,
  CORS_CONFIG,
  HTTP_STATUS,
};
