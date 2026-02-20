import type { Request, Response } from 'express';
import * as newsService from '../services/news.service.ts';
import { successResponse, errorResponse } from '../utils/response.utils.ts';
import logger from '../config/logger.ts';

export const getLocalNews = async (req: Request, res: Response) => {
  const { userId } = (req as unknown as { user: { userId: string } }).user;
  const limit = parseInt(req.query.limit as string) || 10;

  try {
    const news = await newsService.getLocalNewsByUserId(userId, limit);
    return successResponse(res, '지역 뉴스 조회 성공', news, 200);
  } catch (err) {
    logger.error({ err }, 'Error fetching local news');
    return errorResponse(res, '서버 에러', null, 500);
  }
};

export const getDisasterAlerts = async (req: Request, res: Response) => {
  const { userId } = (req as unknown as { user: { userId: string } }).user;
  const limit = parseInt(req.query.limit as string) || 5;

  try {
    const alerts = await newsService.getDisasterAlertsByUserId(userId, limit);
    return successResponse(res, '재난 알림 조회 성공', alerts, 200);
  } catch (err) {
    logger.error({ err }, 'Error fetching disaster alerts');
    return errorResponse(res, '서버 에러', null, 500);
  }
};

export const getNewsSummary = async (req: Request, res: Response) => {
  const { userId } = (req as unknown as { user: { userId: string } }).user;

  try {
    const summary = await newsService.getNewsSummaryByUserId(userId);
    return successResponse(res, '뉴스 요약 정보 조회 성공', summary, 200);
  } catch (err) {
    logger.error({ err }, 'Error fetching news summary');
    return errorResponse(res, '서버 에러', null, 500);
  }
};

export const getAllNews = async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;

  try {
    const news = await newsService.getAllLocalNews(limit);
    return successResponse(res, '전체 뉴스 조회 성공', news, 200);
  } catch (err) {
    logger.error({ err }, 'Error fetching all news');
    return errorResponse(res, '서버 에러', null, 500);
  }
};
