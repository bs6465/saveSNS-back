import express from 'express';
const router = express.Router();
import * as trafficController from '../controllers/traffic.controller.ts';
import { verifyToken } from '../middleware/authMiddleware.ts';

/*
교통정보 routes
*/

/**
 * @swagger
 * /traffic/summary:
 *   get:
 *     summary: 교통 요약 정보 조회
 *     tags: [Traffic]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 교통 요약 정보 조회 성공
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
// GET /api/traffic/summary - 교통 요약 정보 (홈 화면용)
router.get('/summary', verifyToken, trafficController.getTrafficSummary);

/**
 * @swagger
 * /traffic/incidents:
 *   get:
 *     summary: 주변 돌발상황 목록 조회
 *     tags: [Traffic]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 돌발상황 목록 조회 성공
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
// GET /api/traffic/incidents - 주변 돌발상황 목록
router.get('/incidents', verifyToken, trafficController.getIncidents);

/**
 * @swagger
 * /traffic/road:
 *   get:
 *     summary: 주변 도로 소통정보 조회
 *     tags: [Traffic]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 도로 소통정보 조회 성공
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
// GET /api/traffic/road - 주변 도로 소통정보 목록
router.get('/road', verifyToken, trafficController.getRoadTraffic);

export default router;
