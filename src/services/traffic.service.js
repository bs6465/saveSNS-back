import { prisma } from '../prismaClient.js';

/*
교통정보 관련 로직
*/

// 사용자 위치 기반 주변 돌발상황 조회 (반경 5km 이내)
export const getIncidentsByUserId = async (userId, radiusMeters = 5000) => {
  const result = await prisma.$queryRaw`
    SELECT
      ti.traffic_incident_id AS "id",
      ti.incident_id AS "incidentId",
      ti.type,
      ti.title,
      ti.description,
      ti.road_name AS "roadName",
      ti.longitude,
      ti.latitude,
      ti.start_time AS "startTime",
      ti.end_time AS "endTime",
      ti.severity,
      ROUND(ST_Distance(
        ti.location::geography,
        ul.location::geography
      )::numeric, 0) AS "distanceMeters"
    FROM users_location ul
    JOIN traffic_incidents ti ON ST_DWithin(
      ul.location::geography,
      ti.location::geography,
      ${radiusMeters}
    )
    WHERE ul.user_id = ${userId}::uuid
      AND ti.start_time <= NOW()
      AND (ti.end_time IS NULL OR ti.end_time >= NOW())
    ORDER BY "distanceMeters" ASC
    LIMIT 10
  `;

  return result;
};

// 사용자 위치 기반 주변 도로 소통정보 조회 (반경 5km 이내)
export const getRoadTrafficByUserId = async (userId, radiusMeters = 5000) => {
  const result = await prisma.$queryRaw`
    SELECT
      rt.road_traffic_id AS "id",
      rt.road_name AS "roadName",
      rt.link_id AS "linkId",
      rt.speed,
      rt.status,
      rt.longitude,
      rt.latitude,
      rt.data_time AS "dataTime",
      ROUND(ST_Distance(
        rt.location::geography,
        ul.location::geography
      )::numeric, 0) AS "distanceMeters"
    FROM users_location ul
    JOIN road_traffic rt ON ST_DWithin(
      ul.location::geography,
      rt.location::geography,
      ${radiusMeters}
    )
    WHERE ul.user_id = ${userId}::uuid
      AND rt.data_time = (
        SELECT MAX(data_time)
        FROM road_traffic
        WHERE road_name = rt.road_name
      )
    ORDER BY "distanceMeters" ASC
    LIMIT 20
  `;

  return result;
};

// 교통 요약 정보 조회 (돌발 건수 + 소통 상태 통계)
export const getTrafficSummaryByUserId = async (userId, radiusMeters = 5000) => {
  // 돌발상황 건수
  const incidentCount = await prisma.$queryRaw`
    SELECT COUNT(*) AS count
    FROM users_location ul
    JOIN traffic_incidents ti ON ST_DWithin(
      ul.location::geography,
      ti.location::geography,
      ${radiusMeters}
    )
    WHERE ul.user_id = ${userId}::uuid
      AND ti.start_time <= NOW()
      AND (ti.end_time IS NULL OR ti.end_time >= NOW())
  `;

  // 도로 소통 상태 통계 (1: 원활, 2: 서행, 3: 정체)
  const trafficStatus = await prisma.$queryRaw`
    SELECT
      rt.status,
      COUNT(*) AS count
    FROM users_location ul
    JOIN road_traffic rt ON ST_DWithin(
      ul.location::geography,
      rt.location::geography,
      ${radiusMeters}
    )
    WHERE ul.user_id = ${userId}::uuid
      AND rt.data_time = (
        SELECT MAX(data_time)
        FROM road_traffic
        WHERE road_name = rt.road_name
      )
    GROUP BY rt.status
    ORDER BY rt.status
  `;

  // 평균 소통 상태 계산
  const statusCounts = { smooth: 0, slow: 0, congested: 0 };
  let totalRoads = 0;

  trafficStatus.forEach((row) => {
    const count = Number(row.count);
    totalRoads += count;
    if (row.status === 1) statusCounts.smooth = count;
    else if (row.status === 2) statusCounts.slow = count;
    else if (row.status === 3) statusCounts.congested = count;
  });

  // 대표 상태 결정 (정체 > 서행 > 원활)
  let overallStatus = 1;
  if (statusCounts.congested > 0) overallStatus = 3;
  else if (statusCounts.slow > 0) overallStatus = 2;

  return {
    incidentCount: Number(incidentCount[0]?.count || 0),
    roadCount: totalRoads,
    statusCounts,
    overallStatus,
  };
};
