import { prisma } from '../prismaClient.ts';

/*
알림 관련 로직
*/

interface TransformedNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  isRead: boolean;
  createdAt: Date;
  readAt: Date | null;
}

const transformNotification = (
  notification: Record<string, unknown> | null,
): TransformedNotification | null => {
  if (!notification) return null;
  const n = notification as {
    id: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    data: string | null;
    isRead: boolean;
    createdAt: Date;
    readAt: Date | null;
  };
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    body: n.body,
    data: n.data ? JSON.parse(n.data) : null,
    isRead: n.isRead,
    createdAt: n.createdAt,
    readAt: n.readAt,
  };
};

export const createNotification = async (
  userId: string,
  type: string,
  title: string,
  body: string,
  data: unknown = null,
): Promise<TransformedNotification | null> => {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      data: data ? JSON.stringify(data) : null,
    },
  });

  return transformNotification(notification as unknown as Record<string, unknown>);
};

export const createNotificationBulk = async (
  userIds: string[],
  type: string,
  title: string,
  body: string,
  data: unknown = null,
): Promise<number> => {
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

export const getNotificationsByUserId = async (
  userId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<TransformedNotification[]> => {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return notifications
    .map((n) => transformNotification(n as unknown as Record<string, unknown>))
    .filter(Boolean) as TransformedNotification[];
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  const count = await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });

  return count;
};

export const markAsRead = async (notificationId: string, userId: string): Promise<boolean> => {
  const notification = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return notification.count > 0;
};

export const markAllAsRead = async (userId: string): Promise<number> => {
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

export const deleteNotification = async (
  notificationId: string,
  userId: string,
): Promise<boolean> => {
  const result = await prisma.notification.deleteMany({
    where: {
      id: notificationId,
      userId,
    },
  });

  return result.count > 0;
};

export const deleteOldNotifications = async (days: number = 30): Promise<number> => {
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
