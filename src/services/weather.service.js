import { prisma } from '../prismaClient.js';
import { getKstDate } from '../utils/date.utils.js';

/*
날씨 관련 로직
*/

// GET /api/weather/ultrashort 초단기 예보 조회 로직
export const getUltraShortTermForecast = async (userId) => {
  const forecasts = await prisma.weather_ultra_by_user_id.findMany({
    where: {
      user_id: userId,
      fcst_datetime: {
        gte: getKstDate(), // fcst_datetime >= Now() 현재 시각 이후의 예보만 조회
      },
    },
    orderBy: { fcst_datetime: 'asc' },
  });

  console.log(`Get ultra-short-term forecasts for user ${userId} :`, forecasts);

  return forecasts.map((f) => ({
    userId: f.user_id,
    fcstDatetime: f.fcst_datetime,
    t1h: f.t1h,
    rn1: f.rn1,
    sky: f.sky,
    uuu: f.uuu,
    vvv: f.vvv,
    reh: f.reh,
    pty: f.pty,
    lgt: f.lgt,
    vec: f.vec,
    wsd: f.wsd,
  }));
};
