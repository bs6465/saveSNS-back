import { prisma } from '../prismaClient.ts';
import { getCache, setCache, deleteCache, cacheKeys, CACHE_TTL } from '../utils/cache.utils.ts';
import logger from '../config/logger.ts';

/*
프로필 관련 로직
*/

interface ProfileData {
  userId: string;
  username: string;
  nickname: string | null;
}

export const getProfile = async (userId: string): Promise<ProfileData | null> => {
  const key = cacheKeys.profile(userId);
  const cached = getCache<ProfileData>(key);
  if (cached) return cached;

  const profile = await prisma.users_account.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      username: true,
      nickname: true,
    },
  });
  const result: ProfileData | null = profile
    ? {
        userId: profile.user_id,
        username: profile.username,
        nickname: profile.nickname,
      }
    : null;

  if (result) setCache(key, result, CACHE_TTL.profile);
  return result;
};

export const setLocation = async (
  userId: string,
  longitude: number,
  latitude: number,
): Promise<void> => {
  await prisma.users_location.update({
    where: { user_id: userId },
    data: {
      longitude,
      latitude,
    },
    select: {
      user_id: true,
    },
  });
  logger.info(`Location updated: userId:${userId} to (${longitude}, ${latitude})`);
};

export const updateProfile = async (userId: string, nickname: string): Promise<ProfileData> => {
  const updatedProfile = await prisma.users_account.update({
    where: { user_id: userId },
    data: { nickname },
    select: {
      user_id: true,
      username: true,
      nickname: true,
    },
  });
  deleteCache(cacheKeys.profile(userId));
  logger.info(`Profile updated: userId:${userId}, nickname:${nickname}`);
  return {
    userId: updatedProfile.user_id,
    username: updatedProfile.username,
    nickname: updatedProfile.nickname,
  };
};

export const getUserPosts = async (userId: string) => {
  const posts = await prisma.posts.findMany({
    where: { user_id: userId },
    select: {
      post_id: true,
      contents: true,
      created_at: true,
      longitude: true,
      latitude: true,
      media_storage: {
        select: {
          media_id: true,
          link: true,
          type: true,
        },
        orderBy: { created_at: 'asc' },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
  });
  logger.info(`User posts retrieved: userId:${userId}, count:${posts.length}`);
  return posts.map((p) => ({
    postId: p.post_id,
    contents: p.contents,
    createdAt: p.created_at,
    longitude: p.longitude,
    latitude: p.latitude,
    media: p.media_storage.map((m) => ({
      mediaId: m.media_id,
      link: m.link,
      type: m.type,
    })),
  }));
};
