import * as notificationService from '../services/notification.service.js';
import * as pushService from '../services/push.service.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';

/*
알림 관련 컨트롤러
*/

// 푸시 토큰 등록
export const registerPushToken = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { token, deviceType } = req.body;

    await pushService.registerPushToken(userId, token, deviceType);

    return successResponse(res, null, '푸시 토큰 등록 성공', 200);
  } catch (error) {
    next(error);
  }
};

// 푸시 토큰 해제
export const deactivatePushToken = async (req, res, next) => {
  try {
    const { token } = req.body;

    await pushService.deactivatePushToken(token);

    return successResponse(res, null, '푸시 토큰 해제 성공', 200);
  } catch (error) {
    next(error);
  }
};

// 알림 목록 조회
export const getNotifications = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { limit, offset } = req.query; // 스키마에서 이미 숫자로 변환됨

    const notifications = await notificationService.getNotificationsByUserId(userId, limit, offset);
    const unreadCount = await notificationService.getUnreadCount(userId);

    return successResponse(res, { notifications, unreadCount }, '알림 목록 조회 성공', 200);
  } catch (error) {
    next(error);
  }
};

// 읽지 않은 알림 수 조회
export const getUnreadCount = async (req, res, next) => {
  try {
    const { userId } = req.user;

    const count = await notificationService.getUnreadCount(userId);

    return successResponse(res, { unreadCount: count }, '읽지 않은 알림 수 조회 성공', 200);
  } catch (error) {
    next(error);
  }
};

// 알림 읽음 처리
export const markAsRead = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { notificationId } = req.params;

    const success = await notificationService.markAsRead(notificationId, userId);

    if (!success) {
      return errorResponse(res, '알림을 찾을 수 없습니다', 404);
    }

    return successResponse(res, null, '알림 읽음 처리 성공', 200);
  } catch (error) {
    next(error);
  }
};

// 모든 알림 읽음 처리
export const markAllAsRead = async (req, res, next) => {
  try {
    const { userId } = req.user;

    const count = await notificationService.markAllAsRead(userId);

    return successResponse(res, { count }, '모든 알림 읽음 처리 성공', 200);
  } catch (error) {
    next(error);
  }
};

// 알림 삭제
export const deleteNotification = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { notificationId } = req.params;

    const success = await notificationService.deleteNotification(notificationId, userId);

    if (!success) {
      return errorResponse(res, '알림을 찾을 수 없습니다', 404);
    }

    return successResponse(res, null, '알림 삭제 성공', 200);
  } catch (error) {
    next(error);
  }
};
