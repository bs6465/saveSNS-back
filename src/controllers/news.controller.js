import * as newsService from '../services/news.service.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';

/*
지역 뉴스/재난알림 컨트롤러
*/

// GET /api/news/local - 지역 뉴스 목록 조회
export const getLocalNews = async (req, res) => {
  const { userId } = req.user;
  const limit = parseInt(req.query.limit) || 10;

  try {
    const news = await newsService.getLocalNewsByUserId(userId, limit);
    return successResponse(res, '지역 뉴스 조회 성공', news, 200);
  } catch (err) {
    console.error('Error fetching local news:', err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// GET /api/news/alerts - 재난 알림 목록 조회
export const getDisasterAlerts = async (req, res) => {
  const { userId } = req.user;
  const limit = parseInt(req.query.limit) || 5;

  try {
    const alerts = await newsService.getDisasterAlertsByUserId(userId, limit);
    return successResponse(res, '재난 알림 조회 성공', alerts, 200);
  } catch (err) {
    console.error('Error fetching disaster alerts:', err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// GET /api/news/summary - 뉴스/알림 요약 정보 조회 (홈 화면용)
export const getNewsSummary = async (req, res) => {
  const { userId } = req.user;

  try {
    const summary = await newsService.getNewsSummaryByUserId(userId);
    return successResponse(res, '뉴스 요약 정보 조회 성공', summary, 200);
  } catch (err) {
    console.error('Error fetching news summary:', err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// GET /api/news/all - 전체 뉴스 조회 (지역 필터 없음)
export const getAllNews = async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;

  try {
    const news = await newsService.getAllLocalNews(limit);
    return successResponse(res, '전체 뉴스 조회 성공', news, 200);
  } catch (err) {
    console.error('Error fetching all news:', err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};
