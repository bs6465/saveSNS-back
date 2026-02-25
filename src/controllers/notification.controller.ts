import * as notificationService from '../services/notification.service.ts';
import * as pushService from '../services/push.service.ts';
import { successResponse } from '../utils/response.utils.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';
import { NotFoundError } from '../errors/index.ts';

export const registerPushToken = asyncHandler(async (req, res) => {
  const { userId } = req.user!;
  const { token, deviceType } = req.body;

  await pushService.registerPushToken(userId, token, deviceType);
  return successResponse(res, '푸시 토큰 등록 성공', null, 200);
});

export const deactivatePushToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  await pushService.deactivatePushToken(token);
  return successResponse(res, '푸시 토큰 해제 성공', null, 200);
});

export const getNotifications = asyncHandler(async (req, res) => {
  const { userId } = req.user!;
  const { limit, offset } = req.query as { limit?: number; offset?: number };

  const notifications = await notificationService.getNotificationsByUserId(
    userId,
    limit as number,
    offset as number,
  );
  const unreadCount = await notificationService.getUnreadCount(userId);

  return successResponse(res, '알림 목록 조회 성공', { notifications, unreadCount }, 200);
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const { userId } = req.user!;
  const count = await notificationService.getUnreadCount(userId);
  return successResponse(res, '읽지 않은 알림 수 조회 성공', { unreadCount: count }, 200);
});

export const markAsRead = asyncHandler(async (req, res) => {
  const { userId } = req.user!;
  const { notificationId } = req.params;

  const success = await notificationService.markAsRead(notificationId as string, userId);
  if (!success) {
    throw new NotFoundError('알림');
  }
  return successResponse(res, '알림 읽음 처리 성공', null, 200);
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  const { userId } = req.user!;
  const count = await notificationService.markAllAsRead(userId);
  return successResponse(res, '모든 알림 읽음 처리 성공', { count }, 200);
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const { userId } = req.user!;
  const { notificationId } = req.params;

  const success = await notificationService.deleteNotification(notificationId as string, userId);
  if (!success) {
    throw new NotFoundError('알림');
  }
  return successResponse(res, '알림 삭제 성공', null, 200);
});
