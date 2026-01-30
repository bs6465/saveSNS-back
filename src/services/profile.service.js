import { prisma } from '../prismaClient.js';

/*
프로필 관련 로직
*/

// GET /api/profile/:userId 프로필 조회 로직
export const getProfile = async (userId) => {
  const profile = await prisma.userAccount.findUnique({
    where: { userId },
    select: {
      userId: true,
      username: true,
      nickname: true,
    },
  });
  console.log(`Profile retrieved: userId:${userId}`);
  return profile;
};

// POST /api/profile/location 위치 정보 저장 로직
export const setLocation = async (userId, longitude, latitude) => {
  await prisma.userLocation.update({
    where: { userId },
    data: {
      longitude,
      latitude,
    },
    select: {
      userId: true,
    },
  });
  console.log(`Location updated: userId:${userId} to (${longitude}, ${latitude})`);
};

// PATCH /api/profile 프로필 수정 로직
export const updateProfile = async (userId, nickname) => {
  const updatedProfile = await prisma.userAccount.update({
    where: { userId },
    data: { nickname },
    select: {
      userId: true,
      username: true,
      nickname: true,
    },
  });
  console.log(`Profile updated: userId:${userId}, nickname:${nickname}`);
  return updatedProfile;
};

// GET /api/profile/posts 내 게시글 목록 조회 로직
export const getUserPosts = async (userId) => {
  const posts = await prisma.post.findMany({
    where: { userId },
    select: {
      postId: true,
      contents: true,
      createdAt: true,
      longitude: true,
      latitude: true,
      media: {
        select: {
          mediaId: true,
          link: true,
          type: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  console.log(`User posts retrieved: userId:${userId}, count:${posts.length}`);
  return posts;
};
