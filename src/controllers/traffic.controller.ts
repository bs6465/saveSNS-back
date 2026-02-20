import type { Request, Response } from 'express';
import * as trafficService from '../services/traffic.service.ts';
import { successResponse, errorResponse } from '../utils/response.utils.ts';
import logger from '../config/logger.ts';

export const getIncidents = async (req: Request, res: Response) => {
  const { userId } = (req as unknown as { user: { userId: string } }).user;
  const radius = parseInt(req.query.radius as string) || 5000;

  try {
    const incidents = await trafficService.getIncidentsByUserId(userId, radius);
    return successResponse(res, '돌발상황 조회 성공', incidents, 200);
  } catch (err) {
    logger.error({ err }, 'Error fetching traffic incidents');
    return errorResponse(res, '서버 에러', null, 500);
  }
};

export const getRoadTraffic = async (req: Request, res: Response) => {
  const { userId } = (req as unknown as { user: { userId: string } }).user;
  const radius = parseInt(req.query.radius as string) || 5000;

  try {
    const roadTraffic = await trafficService.getRoadTrafficByUserId(userId, radius);
    return successResponse(res, '도로 소통정보 조회 성공', roadTraffic, 200);
  } catch (err) {
    logger.error({ err }, 'Error fetching road traffic');
    return errorResponse(res, '서버 에러', null, 500);
  }
};

export const getTrafficSummary = async (req: Request, res: Response) => {
  const { userId } = (req as unknown as { user: { userId: string } }).user;
  const radius = parseInt(req.query.radius as string) || 5000;

  try {
    const summary = await trafficService.getTrafficSummaryByUserId(userId, radius);
    return successResponse(res, '교통 요약 정보 조회 성공', summary, 200);
  } catch (err) {
    logger.error({ err }, 'Error fetching traffic summary');
    return errorResponse(res, '서버 에러', null, 500);
  }
};
