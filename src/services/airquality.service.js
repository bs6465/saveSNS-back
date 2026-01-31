import { prisma } from '../prismaClient.js';

/*
대기질 관련 로직
*/

// 시도명 기반 최신 대기질 조회
export const getAirQualityBySido = async (sidoName) => {
  const airQuality = await prisma.airQuality.findFirst({
    where: { sidoName },
    orderBy: { dataTime: 'desc' },
    select: {
      stationName: true,
      sidoName: true,
      pm25Value: true,
      pm10Value: true,
      pm25Grade: true,
      pm10Grade: true,
      khaiGrade: true,
      khaiValue: true,
      o3Value: true,
      coValue: true,
      no2Value: true,
      so2Value: true,
      dataTime: true,
    },
  });
  return airQuality;
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
