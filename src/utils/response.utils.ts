import type { Response } from 'express';
import type { ApiResponse } from '../types/index.ts';

export function successResponse<T>(
  res: Response,
  message = 'Success',
  data?: T,
  status = 200,
): Response<ApiResponse<T>> {
  return res.status(status).json({
    status,
    success: true,
    message,
    data,
  });
}

export function errorResponse(
  res: Response,
  message = 'Error',
  data: unknown = null,
  status = 500,
): Response<ApiResponse> {
  return res.status(status).json({
    status,
    success: false,
    message,
    data,
  });
}
