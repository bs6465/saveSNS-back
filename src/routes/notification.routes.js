import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { registerPushTokenSchema, deactivatePushTokenSchema } from '../schema/notification.schema.js';

const router = Router();

// 모든 라우트는 인증 필요
router.use(authMiddleware);

// 푸시 토큰 등록
router.post('/push-token', validate(registerPushTokenSchema), notificationController.registerPushToken);

// 푸시 토큰 해제
router.delete('/push-token', validate(deactivatePushTokenSchema), notificationController.deactivatePushToken);

// 알림 목록 조회
router.get('/', notificationController.getNotifications);

// 읽지 않은 알림 수 조회
router.get('/unread-count', notificationController.getUnreadCount);

// 모든 알림 읽음 처리
router.post('/read-all', notificationController.markAllAsRead);

// 특정 알림 읽음 처리
router.post('/:notificationId/read', notificationController.markAsRead);

// 알림 삭제
router.delete('/:notificationId', notificationController.deleteNotification);

export default router;
