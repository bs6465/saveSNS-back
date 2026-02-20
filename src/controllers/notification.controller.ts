import type { Request, Response, NextFunction } from 'express';
import * as notificationService from '../services/notification.service.ts';
import * as pushService from '../services/push.service.ts';
import { successResponse, errorResponse } from '../utils/response.utils.ts';

export const registerPushToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = (req as unknown as { user: { userId: string } }).user;
    const { token, deviceType } = req.body;

    await pushService.registerPushToken(userId, token, deviceType);
    return successResponse(res, '푸시 토큰 등록 성공', null, 200);
  } catch (error) {
    next(error);
  }
};

export const deactivatePushToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    await pushService.deactivatePushToken(token);
    return successResponse(res, '푸시 토큰 해제 성공', null, 200);
  } catch (error) {
    next(error);
  }
};

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = (req as unknown as { user: { userId: string } }).user;
    const { limit, offset } = req.query as { limit?: number; offset?: number };

    const notifications = await notificationService.getNotificationsByUserId(
      userId,
      limit as number,
      offset as number,
    );
    const unreadCount = await notificationService.getUnreadCount(userId);

    return successResponse(res, '알림 목록 조회 성공', { notifications, unreadCount }, 200);
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = (req as unknown as { user: { userId: string } }).user;
    const count = await notificationService.getUnreadCount(userId);
    return successResponse(res, '읽지 않은 알림 수 조회 성공', { unreadCount: count }, 200);
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = (req as unknown as { user: { userId: string } }).user;
    const { notificationId } = req.params;

    const success = await notificationService.markAsRead(notificationId as string, userId);
    if (!success) {
      return errorResponse(res, '알림을 찾을 수 없습니다', null, 404);
    }
    return successResponse(res, '알림 읽음 처리 성공', null, 200);
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = (req as unknown as { user: { userId: string } }).user;
    const count = await notificationService.markAllAsRead(userId);
    return successResponse(res, '모든 알림 읽음 처리 성공', { count }, 200);
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = (req as unknown as { user: { userId: string } }).user;
    const { notificationId } = req.params;

    const success = await notificationService.deleteNotification(notificationId as string, userId);
    if (!success) {
      return errorResponse(res, '알림을 찾을 수 없습니다', null, 404);
    }
    return successResponse(res, '알림 삭제 성공', null, 200);
  } catch (error) {
    next(error);
  }
};
