import { prisma } from '../prismaClient.ts';
import { getKstDate } from '../utils/date.utils.ts';
import { getCache, setCache, cacheKeys, CACHE_TTL } from '../utils/cache.utils.ts';

/*
날씨 관련 로직
*/

interface ForecastData {
  userId: string;
  fcstDatetime: Date;
  t1h: number | null;
  rn1: number | null;
  sky: number | null;
  uuu: number | null;
  vvv: number | null;
  reh: number | null;
  pty: number | null;
  lgt: number | null;
  vec: number | null;
  wsd: number | null;
}

export const getUltraShortTermForecast = async (userId: string): Promise<ForecastData[]> => {
  const key = cacheKeys.weather(userId);
  const cached = getCache<ForecastData[]>(key);
  if (cached) return cached;

  const forecasts = await prisma.weather_ultra_by_user_id.findMany({
    where: {
      user_id: userId,
      fcst_datetime: {
        gte: getKstDate(),
      },
    },
    orderBy: { fcst_datetime: 'asc' },
  });

  const result: ForecastData[] = forecasts.map((f) => ({
    userId: f.user_id!,
    fcstDatetime: f.fcst_datetime!,
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

  setCache(key, result, CACHE_TTL.weather);
  return result;
};
