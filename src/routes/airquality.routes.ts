import express from 'express';
const router = express.Router();
import * as airqualityController from '../controllers/airquality.controller.ts';
import { verifyToken } from '../middleware/authMiddleware.ts';

/*
대기질 routes
*/

/**
 * @swagger
 * /airquality:
 *   get:
 *     summary: 사용자 위치 기반 대기질 조회
 *     tags: [AirQuality]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 대기질 조회 성공
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
// GET /api/airquality - 사용자 위치 기반 대기질 조회
router.get('/', verifyToken, airqualityController.getAirQuality);

/**
 * @swagger
 * /airquality/{sidoName}:
 *   get:
 *     summary: 시도별 대기질 조회
 *     tags: [AirQuality]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sidoName
 *         required: true
 *         schema:
 *           type: string
 *         description: "시도명 (예: 서울, 부산)"
 *     responses:
 *       200:
 *         description: 시도별 대기질 조회 성공
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
 *       404:
 *         description: 해당 시도를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET /api/airquality/:sidoName - 시도별 대기질 조회
router.get('/:sidoName', verifyToken, airqualityController.getAirQualityBySido);

export default router;
