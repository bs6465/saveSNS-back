import express from 'express';
const router = express.Router();
import * as newsController from '../controllers/news.controller.js';
import { verifyToken } from '../middleware/authMiddleware.js';

/*
지역 뉴스/재난알림 routes
*/

// GET /api/news/summary - 뉴스/알림 요약 정보 (홈 화면용)
router.get('/summary', verifyToken, newsController.getNewsSummary);

// GET /api/news/local - 지역 뉴스 목록
router.get('/local', verifyToken, newsController.getLocalNews);

// GET /api/news/alerts - 재난 알림 목록
router.get('/alerts', verifyToken, newsController.getDisasterAlerts);

// GET /api/news/all - 전체 뉴스 (지역 필터 없음)
router.get('/all', verifyToken, newsController.getAllNews);

export default router;
