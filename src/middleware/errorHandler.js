/**
 * Global error handling middleware
 * Catches all errors and returns standardized error responses
 */

import { AppError } from '../errors/AppError.js';
import { errorResponse } from '../utils/response.utils.js';
import { HTTP_STATUS } from '../config/constants.js';

/**
 * Global error handler middleware
 * Should be registered last in the middleware chain
 */
export const errorHandler = (err, req, res, next) => {
  // Log error for debugging (in development, log full stack)
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  } else {
    console.error('Error:', err.message);
  }

  // Handle AppError instances (operational errors)
  if (err instanceof AppError) {
    return errorResponse(res, err.message, err.data, err.statusCode);
  }

  // Handle Prisma errors
  if (err.code) {
    // Prisma unique constraint violation
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || 'field';
      return errorResponse(res, `이미 존재하는 ${field}입니다`, null, HTTP_STATUS.CONFLICT);
    }

    // Prisma record not found
    if (err.code === 'P2025') {
      return errorResponse(res, '리소스를 찾을 수 없습니다', null, HTTP_STATUS.NOT_FOUND);
    }

    // Prisma foreign key constraint
    if (err.code === 'P2003') {
      return errorResponse(res, '참조된 리소스를 찾을 수 없습니다', null, HTTP_STATUS.BAD_REQUEST);
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, '유효하지 않은 토큰입니다', null, HTTP_STATUS.UNAUTHORIZED);
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, '토큰이 만료되었습니다', null, HTTP_STATUS.UNAUTHORIZED);
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return errorResponse(res, '유효성 검사 실패', errors, HTTP_STATUS.BAD_REQUEST);
  }

  // Handle generic errors (programming errors)
  return errorResponse(
    res,
    process.env.NODE_ENV === 'development' ? err.message : '서버 오류가 발생했습니다',
    null,
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  );
};

/**
 * 404 Not Found handler for undefined routes
 */
export const notFoundHandler = (req, res) => {
  return errorResponse(res, `경로를 찾을 수 없습니다: ${req.method} ${req.path}`, null, HTTP_STATUS.NOT_FOUND);
};

export default errorHandler;
