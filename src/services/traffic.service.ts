import { prisma } from '../prismaClient.ts';

/*
교통정보 관련 로직
*/

const ITS_API_KEY = process.env.ITS_API_KEY || '';
const ITS_TRAFFIC_URL = 'https://openapi.its.go.kr:9443/trafficInfo';

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

interface RoadTrafficItem {
  roadName: string;
  linkId: string;
  speed: number | null;
  status: number;
  roadDrcType: string;
}

interface TrafficStatusRow {
  status: number;
  count: bigint | number;
}

function getStatusFromSpeed(speed: number | null): number {
  if (speed === null) return 1;
  if (speed >= 30) return 1;  // 원활
  if (speed >= 15) return 2;  // 서행
  return 3;                    // 정체
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
): Promise<RoadTrafficItem[]> => {
  if (!ITS_API_KEY) return [];

  // 사용자 위치 조회
  const userLocation = await prisma.$queryRaw<Array<{ longitude: number; latitude: number }>>`
    SELECT longitude, latitude FROM users_location WHERE user_id = ${userId}::uuid
  `;

  if (!userLocation.length) return [];

  const { longitude, latitude } = userLocation[0];

  // 반경을 경위도 bounding box로 변환 (대략적, 1도 ≈ 111km)
  const degreeOffset = radiusMeters / 111000;
  const minX = (longitude - degreeOffset).toFixed(6);
  const maxX = (longitude + degreeOffset).toFixed(6);
  const minY = (latitude - degreeOffset).toFixed(6);
  const maxY = (latitude + degreeOffset).toFixed(6);

  const params = new URLSearchParams({
    apiKey: ITS_API_KEY,
    type: 'all',
    getType: 'json',
    minX,
    maxX,
    minY,
    maxY,
  });

  const response = await fetch(`${ITS_TRAFFIC_URL}?${params}`, {
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) return [];

  const data = (await response.json()) as {
    header: { resultCode: number };
    body: { items: Array<Record<string, string>> } | string;
  };

  if (data.header.resultCode !== 0) return [];
  if (typeof data.body !== 'object') return [];

  let items = data.body.items || [];
  if (!Array.isArray(items)) return [];

  // 도로명 기준 중복 제거 (같은 도로의 여러 링크 중 대표 하나만)
  const roadMap = new Map<string, RoadTrafficItem>();
  for (const item of items) {
    const roadName = item.roadName || 'Unknown';
    const speed = item.speed ? parseFloat(item.speed) : null;
    const key = `${roadName}_${item.roadDrcType || ''}`;

    if (!roadMap.has(key)) {
      roadMap.set(key, {
        roadName,
        linkId: item.linkId || '',
        speed,
        status: getStatusFromSpeed(speed),
        roadDrcType: item.roadDrcType || '',
      });
    }
  }

  return Array.from(roadMap.values()).slice(0, 20);
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

  // 도로 소통정보는 실시간 API에서 가져옴
  const roadTraffic = await getRoadTrafficByUserId(userId, radiusMeters);

  const statusCounts = { smooth: 0, slow: 0, congested: 0 };
  let totalRoads = roadTraffic.length;

  for (const road of roadTraffic) {
    if (road.status === 1) statusCounts.smooth++;
    else if (road.status === 2) statusCounts.slow++;
    else if (road.status === 3) statusCounts.congested++;
  }

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
