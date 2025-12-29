import { prisma } from '../prismaClient.js';

/*
프로필 관련 로직
*/

// GET /api/profile/:userId 프로필 조회 로직
export const getProfileById = async (userId) => {
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
  });
  console.log(`Location updated: userId:${userId} to (${longitude}, ${latitude})`);
};
