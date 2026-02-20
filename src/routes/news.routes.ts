import express from 'express';
const router = express.Router();
import * as newsController from '../controllers/news.controller.ts';
import { verifyToken } from '../middleware/authMiddleware.ts';

/*
지역 뉴스/재난알림 routes
*/

/**
 * @swagger
 * /news/summary:
 *   get:
 *     summary: 뉴스/알림 요약 정보 조회
 *     tags: [News]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 뉴스 요약 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET /api/news/summary - 뉴스/알림 요약 정보 (홈 화면용)
router.get('/summary', verifyToken, newsController.getNewsSummary);

/**
 * @swagger
 * /news/local:
 *   get:
 *     summary: 지역 뉴스 목록 조회
 *     tags: [News]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 지역 뉴스 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET /api/news/local - 지역 뉴스 목록
router.get('/local', verifyToken, newsController.getLocalNews);

/**
 * @swagger
 * /news/alerts:
 *   get:
 *     summary: 재난 알림 목록 조회
 *     tags: [News]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 재난 알림 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET /api/news/alerts - 재난 알림 목록
router.get('/alerts', verifyToken, newsController.getDisasterAlerts);

/**
 * @swagger
 * /news/all:
 *   get:
 *     summary: 전체 뉴스 조회
 *     tags: [News]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 전체 뉴스 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET /api/news/all - 전체 뉴스 (지역 필터 없음)
router.get('/all', verifyToken, newsController.getAllNews);

export default router;
