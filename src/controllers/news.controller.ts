import * as newsService from '../services/news.service.ts';
import { successResponse } from '../utils/response.utils.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';

export const getLocalNews = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const news = await newsService.getLocalNewsByUserId(req.user!.userId, limit);
  return successResponse(res, '지역 뉴스 조회 성공', news, 200);
});

export const getDisasterAlerts = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 5;
  const alerts = await newsService.getDisasterAlertsByUserId(req.user!.userId, limit);
  return successResponse(res, '재난 알림 조회 성공', alerts, 200);
});

export const getNewsSummary = asyncHandler(async (req, res) => {
  const summary = await newsService.getNewsSummaryByUserId(req.user!.userId);
  return successResponse(res, '뉴스 요약 정보 조회 성공', summary, 200);
});

export const getAllNews = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const news = await newsService.getAllLocalNews(limit);
  return successResponse(res, '전체 뉴스 조회 성공', news, 200);
});
