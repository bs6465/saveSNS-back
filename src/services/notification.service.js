import { prisma } from '../prismaClient.js';

/*
알림 관련 로직
*/

// 알림 데이터 변환
const transformNotification = (notification) => {
  if (!notification) return null;
  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: notification.data ? JSON.parse(notification.data) : null,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
    readAt: notification.readAt,
  };
};

// 알림 생성
export const createNotification = async (userId, type, title, body, data = null) => {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      data: data ? JSON.stringify(data) : null,
    },
  });

  return transformNotification(notification);
};

// 여러 사용자에게 알림 일괄 생성
export const createNotificationBulk = async (userIds, type, title, body, data = null) => {
  const notifications = await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type,
      title,
      body,
      data: data ? JSON.stringify(data) : null,
    })),
  });

  return notifications.count;
};

// 사용자의 알림 목록 조회
export const getNotificationsByUserId = async (userId, limit = 50, offset = 0) => {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return notifications.map(transformNotification);
};

// 읽지 않은 알림 수 조회
export const getUnreadCount = async (userId) => {
  const count = await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });

  return count;
};

// 알림 읽음 처리
export const markAsRead = async (notificationId, userId) => {
  const notification = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId, // 본인 알림만 수정 가능
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return notification.count > 0;
};

// 모든 알림 읽음 처리
export const markAllAsRead = async (userId) => {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return result.count;
};

// 알림 삭제
export const deleteNotification = async (notificationId, userId) => {
  const result = await prisma.notification.deleteMany({
    where: {
      id: notificationId,
      userId,
    },
  });

  return result.count > 0;
};

// 오래된 알림 삭제 (30일 이상)
export const deleteOldNotifications = async (days = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await prisma.notification.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
};
