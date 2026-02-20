import { prisma } from '../prismaClient.ts';
import logger from '../config/logger.ts';

/*
푸시 알림 관련 로직
- Expo Push Notifications 사용
*/

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  sound: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

export const registerPushToken = async (
  userId: string,
  token: string,
  deviceType: string | null = null,
): Promise<boolean> => {
  const existingToken = await prisma.push_token.findUnique({
    where: { token },
  });

  if (existingToken) {
    if (existingToken.userId !== userId) {
      await prisma.push_token.update({
        where: { token },
        data: {
          userId,
          deviceType,
          isActive: true,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.push_token.update({
        where: { token },
        data: {
          isActive: true,
          deviceType,
          updatedAt: new Date(),
        },
      });
    }
  } else {
    await prisma.push_token.create({
      data: {
        userId,
        token,
        deviceType,
      },
    });
  }

  return true;
};

export const deactivatePushToken = async (token: string): Promise<void> => {
  await prisma.push_token.updateMany({
    where: { token },
    data: { isActive: false },
  });
};

export const getActiveTokensByUserId = async (userId: string) => {
  const tokens = await prisma.push_token.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      token: true,
      deviceType: true,
    },
  });

  return tokens;
};

export const getActiveTokensByUserIds = async (userIds: string[]) => {
  const tokens = await prisma.push_token.findMany({
    where: {
      userId: { in: userIds },
      isActive: true,
    },
    select: {
      userId: true,
      token: true,
    },
  });

  return tokens;
};

export const sendPushNotification = async (
  pushToken: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<unknown> => {
  const message: PushMessage = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
  };

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    logger.error({ err: error }, 'Push notification error');
    return null;
  }
};

export const sendPushNotificationBulk = async (
  pushTokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<unknown[]> => {
  if (!pushTokens || pushTokens.length === 0) return [];

  const messages: PushMessage[] = pushTokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  const chunks: PushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  const results: unknown[] = [];
  for (const chunk of chunks) {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      const result = await response.json();
      results.push(result);
    } catch (error) {
      logger.error({ err: error }, 'Bulk push notification error');
    }
  }

  return results;
};

export const sendPushToUser = async (
  userId: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<boolean> => {
  const tokens = await getActiveTokensByUserId(userId);

  if (tokens.length === 0) return false;

  const pushTokens = tokens.map((t) => t.token);
  await sendPushNotificationBulk(pushTokens, title, body, data);

  return true;
};

export const sendPushToUsers = async (
  userIds: string[],
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<number> => {
  const tokens = await getActiveTokensByUserIds(userIds);

  if (tokens.length === 0) return 0;

  const pushTokens = tokens.map((t) => t.token);
  await sendPushNotificationBulk(pushTokens, title, body, data);

  return tokens.length;
};

export const sendPushToNearbyUsers = async (
  longitude: number,
  latitude: number,
  radiusMeters: number,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<number> => {
  const users = await prisma.$queryRaw<Array<{ user_id: string }>>`
    SELECT ul.user_id
    FROM users_location ul
    WHERE ST_DWithin(
      ul.location::geography,
      ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
      ${radiusMeters}
    )
  `;

  if (!users || users.length === 0) return 0;

  const userIds = users.map((u) => u.user_id);
  return await sendPushToUsers(userIds, title, body, data);
};
