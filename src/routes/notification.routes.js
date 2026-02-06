import express from 'express';
const router = express.Router();
import * as notificationController from '../controllers/notification.controller.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import * as notificationSchema from '../schema/notification.schema.js';

/*
알림 routes
*/

// ============ 푸시 토큰 ============
router.post(
  '/push-token',
  [verifyToken, validateBody(notificationSchema.registerPushTokenSchema)],
  notificationController.registerPushToken,
); // POST /push-token 푸시 토큰 등록

router.delete(
  '/push-token',
  [verifyToken, validateBody(notificationSchema.deactivatePushTokenSchema)],
  notificationController.deactivatePushToken,
); // DELETE /push-token 푸시 토큰 해제

// ============ 알림 목록 ============
router.get(
  '/',
  [verifyToken, validateQuery(notificationSchema.getNotificationsSchema)],
  notificationController.getNotifications,
); // GET / 알림 목록 조회

router.get(
  '/unread-count',
  verifyToken,
  notificationController.getUnreadCount,
); // GET /unread-count 읽지 않은 알림 수

// ============ 알림 상태 변경 ============
router.post(
  '/read-all',
  verifyToken,
  notificationController.markAllAsRead,
); // POST /read-all 모두 읽음 처리

router.post(
  '/:notificationId/read',
  [verifyToken, validateParams(notificationSchema.notificationIdSchema)],
  notificationController.markAsRead,
); // POST /:notificationId/read 특정 알림 읽음

router.delete(
  '/:notificationId',
  [verifyToken, validateParams(notificationSchema.notificationIdSchema)],
  notificationController.deleteNotification,
); // DELETE /:notificationId 알림 삭제

export default router;
