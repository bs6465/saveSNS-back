import { prisma } from '../prismaClient.js';

/*
대기질 관련 로직
*/

// 시도명 기반 최신 대기질 조회
export const getAirQualityBySido = async (sidoName) => {
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

  return {
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
};

// 사용자 위치 기반 대기질 조회 (Sig 테이블과 조인하여 시도명 추출)
export const getAirQualityByUserId = async (userId) => {
  // 사용자 위치에서 시도명 추출 (PostGIS ST_Contains 사용)
  const result = await prisma.$queryRaw`
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

  console.log(`Air quality for user ${userId}:`, result);
  return result[0] || null;
};

// 전체 시도 목록의 최신 대기질 조회
export const getAllLatestAirQuality = async () => {
  const airQualities = await prisma.$queryRaw`
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
