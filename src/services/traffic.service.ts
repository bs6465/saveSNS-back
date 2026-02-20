import { prisma } from '../prismaClient.ts';

/*
교통정보 관련 로직
*/

interface TrafficIncident {
  id: string;
  incidentId: string | null;
  type: string | null;
  title: string | null;
  description: string | null;
  roadName: string | null;
  longitude: number | null;
  latitude: number | null;
  startTime: Date | null;
  endTime: Date | null;
  severity: number | null;
  distanceMeters: number;
}

interface RoadTraffic {
  id: string;
  roadName: string | null;
  linkId: string | null;
  speed: number | null;
  status: number | null;
  longitude: number | null;
  latitude: number | null;
  dataTime: Date | null;
  distanceMeters: number;
}

interface TrafficStatusRow {
  status: number;
  count: bigint | number;
}

export const getIncidentsByUserId = async (
  userId: string,
  radiusMeters: number = 5000,
): Promise<TrafficIncident[]> => {
  const result = await prisma.$queryRaw<TrafficIncident[]>`
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

export const getRoadTrafficByUserId = async (
  userId: string,
  radiusMeters: number = 5000,
): Promise<RoadTraffic[]> => {
  const result = await prisma.$queryRaw<RoadTraffic[]>`
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

export const getTrafficSummaryByUserId = async (userId: string, radiusMeters: number = 5000) => {
  const incidentCount = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
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

  const trafficStatus = await prisma.$queryRaw<TrafficStatusRow[]>`
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

  const statusCounts = { smooth: 0, slow: 0, congested: 0 };
  let totalRoads = 0;

  trafficStatus.forEach((row) => {
    const count = Number(row.count);
    totalRoads += count;
    if (row.status === 1) statusCounts.smooth = count;
    else if (row.status === 2) statusCounts.slow = count;
    else if (row.status === 3) statusCounts.congested = count;
  });

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
