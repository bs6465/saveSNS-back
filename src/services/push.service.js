import { prisma } from '../prismaClient.js';

/*
푸시 알림 관련 로직
- Expo Push Notifications 사용
*/

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// 푸시 토큰 등록/업데이트
export const registerPushToken = async (userId, token, deviceType = null) => {
  // 기존 토큰이 있으면 업데이트, 없으면 생성
  const existingToken = await prisma.push_token.findUnique({
    where: { token },
  });

  if (existingToken) {
    // 다른 사용자의 토큰이면 해당 사용자로 변경
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
      // 같은 사용자면 활성화만
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
    // 새 토큰 생성
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

// 푸시 토큰 비활성화
export const deactivatePushToken = async (token) => {
  await prisma.push_token.updateMany({
    where: { token },
    data: { isActive: false },
  });
};

// 사용자의 활성 푸시 토큰 조회
export const getActiveTokensByUserId = async (userId) => {
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

// 여러 사용자의 활성 푸시 토큰 조회
export const getActiveTokensByUserIds = async (userIds) => {
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

// Expo Push 메시지 전송
export const sendPushNotification = async (pushToken, title, body, data = {}) => {
  const message = {
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
    console.error('Push notification error:', error);
    return null;
  }
};

// 여러 디바이스에 푸시 전송
export const sendPushNotificationBulk = async (pushTokens, title, body, data = {}) => {
  if (!pushTokens || pushTokens.length === 0) return [];

  const messages = pushTokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  // Expo는 한 번에 최대 100개 메시지 전송 가능
  const chunks = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  const results = [];
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
      console.error('Bulk push notification error:', error);
    }
  }

  return results;
};

// 특정 사용자에게 푸시 알림 전송
export const sendPushToUser = async (userId, title, body, data = {}) => {
  const tokens = await getActiveTokensByUserId(userId);

  if (tokens.length === 0) return false;

  const pushTokens = tokens.map((t) => t.token);
  await sendPushNotificationBulk(pushTokens, title, body, data);

  return true;
};

// 여러 사용자에게 푸시 알림 전송
export const sendPushToUsers = async (userIds, title, body, data = {}) => {
  const tokens = await getActiveTokensByUserIds(userIds);

  if (tokens.length === 0) return 0;

  const pushTokens = tokens.map((t) => t.token);
  await sendPushNotificationBulk(pushTokens, title, body, data);

  return tokens.length;
};

// 지역 기반 사용자에게 푸시 전송 (재난 알림용)
export const sendPushToNearbyUsers = async (longitude, latitude, radiusMeters, title, body, data = {}) => {
  // PostGIS로 반경 내 사용자 조회
  const users = await prisma.$queryRaw`
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
