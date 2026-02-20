import type { Request, Response } from 'express';
import * as weatherService from '../services/weather.service.ts';
import { successResponse, errorResponse } from '../utils/response.utils.ts';
import logger from '../config/logger.ts';

export const getUltraShortTermForecast = async (req: Request, res: Response) => {
  const { userId } = (req as unknown as { user: { userId: string } }).user;
  try {
    const forecasts = await weatherService.getUltraShortTermForecast(userId);
    return successResponse(res, '초단기 예보 조회 성공', forecasts, 200);
  } catch (err) {
    logger.error({ err }, 'Weather fetch failed');
    return errorResponse(res, '서버 에러', null, 500);
  }
};
