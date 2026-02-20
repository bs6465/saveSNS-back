import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.ts';
import { errorResponse } from '../utils/response.utils.ts';
import { HTTP_STATUS } from '../config/constants.ts';
import { captureError } from '../config/sentry.ts';
import { incCounter } from '../config/metrics.ts';
import logger from '../config/logger.ts';

export const errorHandler = (
  err: Error & {
    code?: string;
    meta?: { target?: string[] };
    errors?: Array<{ path: string[]; message: string }>;
  },
  req: Request,
  res: Response,
  _next: NextFunction,
): Response => {
  if (process.env.NODE_ENV === 'development') {
    logger.error({ err }, 'Unhandled error');
  } else {
    logger.error({ err: { message: err.message } }, 'Unhandled error');
  }

  if (err instanceof AppError) {
    return errorResponse(res, err.message, err.data, err.statusCode);
  }

  if (err.code) {
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0] || 'field';
      return errorResponse(res, `이미 존재하는 ${field}입니다`, null, HTTP_STATUS.CONFLICT);
    }
    if (err.code === 'P2025') {
      return errorResponse(res, '리소스를 찾을 수 없습니다', null, HTTP_STATUS.NOT_FOUND);
    }
    if (err.code === 'P2003') {
      return errorResponse(res, '참조된 리소스를 찾을 수 없습니다', null, HTTP_STATUS.BAD_REQUEST);
    }
  }

  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, '유효하지 않은 토큰입니다', null, HTTP_STATUS.UNAUTHORIZED);
  }
  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, '토큰이 만료되었습니다', null, HTTP_STATUS.UNAUTHORIZED);
  }

  if (err.name === 'ZodError' && err.errors) {
    const errors = err.errors.map((e: { path: string[]; message: string }) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return errorResponse(res, '유효성 검사 실패', errors, HTTP_STATUS.BAD_REQUEST);
  }

  captureError(err, {
    userId: (req as unknown as { user?: { userId: string } }).user?.userId,
    requestId: (req as unknown as { id?: string }).id,
    path: `${req.method} ${req.path}`,
  });
  incCounter('errors_total', { type: 'unhandled' });

  return errorResponse(
    res,
    process.env.NODE_ENV === 'development' ? err.message : '서버 오류가 발생했습니다',
    null,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
  );
};

export const notFoundHandler = (req: Request, res: Response): Response => {
  return errorResponse(
    res,
    `경로를 찾을 수 없습니다: ${req.method} ${req.path}`,
    null,
    HTTP_STATUS.NOT_FOUND,
  );
};

export default errorHandler;
