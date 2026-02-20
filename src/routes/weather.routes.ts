import express from 'express';
const router = express.Router(); // express의 라우터 기능을 사용
import * as weatherController from '../controllers/weather.controller.ts';
import { verifyToken } from '../middleware/authMiddleware.ts';
import { validateBody } from '../middleware/validate.ts';
import * as authSchema from '../schema/auth.schema.ts';

/*
날씨 routes
*/

/**
 * @swagger
 * /weather/ultrashort:
 *   get:
 *     summary: 초단기 예보 조회
 *     tags: [Weather]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 초단기 예보 조회 성공
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
router.get('/ultrashort', verifyToken, weatherController.getUltraShortTermForecast); // GET /api/weather/ultrashort 초단기 예보 조회

export default router;
