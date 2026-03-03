import { prisma } from '../prismaClient.ts';
import { getCache, setCache, cacheKeys, CACHE_TTL } from '../utils/cache.utils.ts';
import logger from '../config/logger.ts';

/*
대기질 관련 로직
*/

interface AirQualityData {
  stationName: string | null;
  sidoName: string | null;
  pm25Value: number | null;
  pm10Value: number | null;
  pm25Grade: number | null;
  pm10Grade: number | null;
  khaiGrade: number | null;
  khaiValue: number | null;
  o3Value: number | null;
  coValue: number | null;
  no2Value: number | null;
  so2Value: number | null;
  dataTime: Date | null;
}

export const getAirQualityBySido = async (sidoName: string): Promise<AirQualityData | null> => {
  const key = cacheKeys.airQuality(sidoName);
  const cached = await getCache<AirQualityData>(key);
  if (cached) return cached;

  const airQuality = await prisma.air_quality.findFirst({
    where: { sido_name: sidoName },
    orderBy: { data_time: 'desc' },
    select: {
      station_name: true,
      sido_name: true,
      pm25_value: true,
      pm10_value: true,
      pm25_grade: true,
      pm10_grade: true,
      khai_grade: true,
      khai_value: true,
      o3_value: true,
      co_value: true,
      no2_value: true,
      so2_value: true,
      data_time: true,
    },
  });

  if (!airQuality) return null;

  const result: AirQualityData = {
    stationName: airQuality.station_name,
    sidoName: airQuality.sido_name,
    pm25Value: airQuality.pm25_value,
    pm10Value: airQuality.pm10_value,
    pm25Grade: airQuality.pm25_grade,
    pm10Grade: airQuality.pm10_grade,
    khaiGrade: airQuality.khai_grade,
    khaiValue: airQuality.khai_value,
    o3Value: airQuality.o3_value,
    coValue: airQuality.co_value,
    no2Value: airQuality.no2_value,
    so2Value: airQuality.so2_value,
    dataTime: airQuality.data_time,
  };

  await setCache(key, result, CACHE_TTL.airQuality);
  return result;
};

export const getAirQualityByUserId = async (userId: string): Promise<AirQualityData | null> => {
  const result = await prisma.$queryRaw<AirQualityData[]>`
    SELECT
      aq.station_name AS "stationName",
      aq.sido_name AS "sidoName",
      aq.pm25_value AS "pm25Value",
      aq.pm10_value AS "pm10Value",
      aq.pm25_grade AS "pm25Grade",
      aq.pm10_grade AS "pm10Grade",
      aq.khai_grade AS "khaiGrade",
      aq.khai_value AS "khaiValue",
      aq.o3_value AS "o3Value",
      aq.co_value AS "coValue",
      aq.no2_value AS "no2Value",
      aq.so2_value AS "so2Value",
      aq.data_time AS "dataTime"
    FROM users_location ul
    JOIN sig s ON ST_Contains(s.geom, ul.location)
    JOIN air_quality aq ON aq.sido_name = s.sido_nm
    WHERE ul.user_id = ${userId}::uuid
      AND aq.data_time = (
        SELECT MAX(data_time)
        FROM air_quality
        WHERE sido_name = s.sido_nm
      )
    LIMIT 1
  `;

  logger.info({ userId, hasResult: result.length > 0 }, 'Air quality retrieved for user');
  return result[0] || null;
};

export const getAllLatestAirQuality = async (): Promise<AirQualityData[]> => {
  const airQualities = await prisma.$queryRaw<AirQualityData[]>`
    SELECT DISTINCT ON (sido_name)
      station_name AS "stationName",
      sido_name AS "sidoName",
      pm25_value AS "pm25Value",
      pm10_value AS "pm10Value",
      pm25_grade AS "pm25Grade",
      pm10_grade AS "pm10Grade",
      khai_grade AS "khaiGrade",
      khai_value AS "khaiValue",
      data_time AS "dataTime"
    FROM air_quality
    ORDER BY sido_name, data_time DESC
  `;
  return airQualities;
};

interface AirQualityForecast {
  sidoName: string;
  informCode: string;
  forecastDate: Date;
  publishTime: Date;
  grade: number;
  informCause: string | null;
  informOverall: string | null;
}

export const getAirQualityForecastByUserId = async (
  userId: string,
): Promise<AirQualityForecast[]> => {
  const result = await prisma.$queryRaw<AirQualityForecast[]>`
    SELECT
      aqf.sido_name AS "sidoName",
      aqf.inform_code AS "informCode",
      aqf.forecast_date AS "forecastDate",
      aqf.publish_time AS "publishTime",
      aqf.grade,
      aqf.inform_cause AS "informCause",
      aqf.inform_overall AS "informOverall"
    FROM users_location ul
    JOIN sig s ON ST_Contains(s.geom, ul.location)
    JOIN air_quality_forecast aqf ON aqf.sido_name = s.sido_nm
    WHERE ul.user_id = ${userId}::uuid
      AND aqf.forecast_date >= CURRENT_DATE
    ORDER BY aqf.forecast_date ASC, aqf.inform_code ASC
  `;

  logger.info({ userId, count: result.length }, 'Air quality forecast retrieved for user');
  return result;
};
