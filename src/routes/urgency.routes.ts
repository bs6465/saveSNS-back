import express from 'express';
import * as urgencyController from '../controllers/urgency.controller.ts';
import { verifyToken } from '../middleware/authMiddleware.ts';
import { validateQuery, validateBody, validateParams } from '../middleware/validate.ts';
import * as urgencySchema from '../schema/urgency.schema.ts';

const router = express.Router();

/**
 * @swagger
 * /urgency:
 *   get:
 *     summary: 주변 긴급 리포트 목록 조회
 *     tags: [Urgency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: radiusMeters
 *         schema:
 *           type: integer
 *           default: 5000
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 긴급 리포트 목록
 */
router.get(
  '/',
  verifyToken,
  validateQuery(urgencySchema.getUrgencyReportsQuery),
  urgencyController.getUrgencyReports,
);

/**
 * @swagger
 * /urgency/{reportId}/feedback:
 *   post:
 *     summary: 긴급 리포트 확인/신고
 *     tags: [Urgency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [confirm, report]
 *     responses:
 *       200:
 *         description: 피드백 처리 완료
 */
router.post(
  '/:reportId/feedback',
  verifyToken,
  validateParams(urgencySchema.urgencyReportIdParam),
  validateBody(urgencySchema.submitFeedbackBody),
  urgencyController.submitFeedback,
);

export default router;
