import express from 'express';
const router = express.Router();
import * as notificationController from '../controllers/notification.controller.ts';
import { verifyToken } from '../middleware/authMiddleware.ts';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.ts';
import * as notificationSchema from '../schema/notification.schema.ts';

/*
알림 routes
*/

// ============ 푸시 토큰 ============

/**
 * @swagger
 * /notifications/push-token:
 *   post:
 *     summary: 푸시 토큰 등록
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, platform]
 *             properties:
 *               token:
 *                 type: string
 *                 description: 푸시 토큰
 *               platform:
 *                 type: string
 *                 description: 플랫폼 (ios, android)
 *     responses:
 *       200:
 *         description: 푸시 토큰 등록 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/push-token',
  [verifyToken, validateBody(notificationSchema.registerPushTokenSchema)],
  notificationController.registerPushToken,
); // POST /push-token 푸시 토큰 등록

/**
 * @swagger
 * /notifications/push-token:
 *   delete:
 *     summary: 푸시 토큰 해제
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 description: 푸시 토큰
 *     responses:
 *       200:
 *         description: 푸시 토큰 해제 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete(
  '/push-token',
  [verifyToken, validateBody(notificationSchema.deactivatePushTokenSchema)],
  notificationController.deactivatePushToken,
); // DELETE /push-token 푸시 토큰 해제

// ============ 알림 목록 ============

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: 알림 목록 조회
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 조회 개수
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: 오프셋
 *     responses:
 *       200:
 *         description: 알림 목록 조회 성공
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
router.get(
  '/',
  [verifyToken, validateQuery(notificationSchema.getNotificationsSchema)],
  notificationController.getNotifications,
); // GET / 알림 목록 조회

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: 읽지 않은 알림 수 조회
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 읽지 않은 알림 수 조회 성공
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
router.get('/unread-count', verifyToken, notificationController.getUnreadCount); // GET /unread-count 읽지 않은 알림 수

// ============ 알림 상태 변경 ============

/**
 * @swagger
 * /notifications/read-all:
 *   post:
 *     summary: 모든 알림 읽음 처리
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 모두 읽음 처리 성공
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
router.post('/read-all', verifyToken, notificationController.markAllAsRead); // POST /read-all 모두 읽음 처리

/**
 * @swagger
 * /notifications/{notificationId}/read:
 *   post:
 *     summary: 특정 알림 읽음 처리
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: 알림 ID
 *     responses:
 *       200:
 *         description: 알림 읽음 처리 성공
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
 *         description: 알림을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/:notificationId/read',
  [verifyToken, validateParams(notificationSchema.notificationIdSchema)],
  notificationController.markAsRead,
); // POST /:notificationId/read 특정 알림 읽음

/**
 * @swagger
 * /notifications/{notificationId}:
 *   delete:
 *     summary: 알림 삭제
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: 알림 ID
 *     responses:
 *       200:
 *         description: 알림 삭제 성공
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
 *         description: 알림을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete(
  '/:notificationId',
  [verifyToken, validateParams(notificationSchema.notificationIdSchema)],
  notificationController.deleteNotification,
); // DELETE /:notificationId 알림 삭제

export default router;
