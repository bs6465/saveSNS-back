import { prisma } from '../prismaClient.js';

/*
프로필 관련 로직
*/

// GET /api/profile/:userId 프로필 조회 로직
export const getProfile = async (userId) => {
  const profile = await prisma.users_account.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      username: true,
      nickname: true,
    },
  });
  console.log(`Profile retrieved: userId:${userId}`);
  return profile
    ? {
        userId: profile.user_id,
        username: profile.username,
        nickname: profile.nickname,
      }
    : null;
};

// POST /api/profile/location 위치 정보 저장 로직
export const setLocation = async (userId, longitude, latitude) => {
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
  console.log(`Location updated: userId:${userId} to (${longitude}, ${latitude})`);
};

// PATCH /api/profile 프로필 수정 로직
export const updateProfile = async (userId, nickname) => {
  const updatedProfile = await prisma.users_account.update({
    where: { user_id: userId },
    data: { nickname },
    select: {
      user_id: true,
      username: true,
      nickname: true,
    },
  });
  console.log(`Profile updated: userId:${userId}, nickname:${nickname}`);
  return {
    userId: updatedProfile.user_id,
    username: updatedProfile.username,
    nickname: updatedProfile.nickname,
  };
};

// GET /api/profile/posts 내 게시글 목록 조회 로직
export const getUserPosts = async (userId) => {
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
  console.log(`User posts retrieved: userId:${userId}, count:${posts.length}`);
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
