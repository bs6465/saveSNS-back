import { prisma } from '../prismaClient.js';

/*
날씨 관련 로직
*/

// GET /api/weather/ultrashort 초단기 예보 조회 로직
export const getUltraShortTermForecast = async (userId) => {
  const forecasts = await prisma.weatherUltraByUserId.findMany({
    where: {
      userId,
      fcstDatetime: {
        gte: new Date(), // fcst_datetime >= Now() 현재 시각 이후의 예보만 조회
      },
    },
    orderBy: { fcstDatetime: 'asc' },
  });

  console.log(`Get ultra-short-term forecasts for user ${userId} :`, forecasts);
  return forecasts;
};
