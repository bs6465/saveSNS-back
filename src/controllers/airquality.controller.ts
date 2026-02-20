import type { Request, Response } from 'express';
import * as airqualityService from '../services/airquality.service.ts';
import { successResponse, errorResponse } from '../utils/response.utils.ts';
import logger from '../config/logger.ts';

export const getAirQuality = async (req: Request, res: Response) => {
  const { userId } = (req as unknown as { user: { userId: string } }).user;

  try {
    const airQuality = await airqualityService.getAirQualityByUserId(userId);
    if (!airQuality) {
      return successResponse(res, '대기질 정보가 없습니다', null, 200);
    }
    return successResponse(res, '대기질 조회 성공', airQuality, 200);
  } catch (err) {
    logger.error({ err }, 'Error fetching air quality');
    return errorResponse(res, '서버 에러', null, 500);
  }
};

export const getAirQualityBySido = async (req: Request, res: Response) => {
  const sidoName = req.params.sidoName as string;

  try {
    const airQuality = await airqualityService.getAirQualityBySido(sidoName);
    if (!airQuality) {
      return successResponse(res, '해당 지역의 대기질 정보가 없습니다', null, 200);
    }
    return successResponse(res, '대기질 조회 성공', airQuality, 200);
  } catch (err) {
    logger.error({ err }, 'Error fetching air quality by sido');
    return errorResponse(res, '서버 에러', null, 500);
  }
};
