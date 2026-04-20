/**
 * 대피소 서비스 - 주변 대피소 조회 (PostGIS 기반)
 */

import { prisma } from '../prismaClient.ts';
import logger from '../config/logger.ts';

interface ShelterResult {
  shelterId: string;
  name: string;
  address: string | null;
  shelterType: string;
  longitude: number | null;
  latitude: number | null;
  capacity: number | null;
  phone: string | null;
  sidoName: string | null;
  sigunguName: string | null;
  distance?: number;
}

export const getNearbyShelters = async (
  longitude: number,
  latitude: number,
  radiusMeters: number = 5000,
  shelterType: string | null = null,
  limit: number = 50,
): Promise<ShelterResult[]> => {
  const typeFilter = shelterType ? 'AND s.shelter_type = $5' : '';
  const params: (number | string)[] = [longitude, latitude, radiusMeters, limit];
  if (shelterType) params.push(shelterType);

  const shelters = await prisma.$queryRawUnsafe<ShelterResult[]>(
    `
    SELECT
      s.shelter_id AS "shelterId",
      s.name,
      s.address,
      s.shelter_type AS "shelterType",
      s.longitude,
      s.latitude,
      s.capacity,
      s.phone,
      s.sido_name AS "sidoName",
      s.sigungu_name AS "sigunguName",
      ST_Distance(
        ST_SetSRID(ST_MakePoint(s.longitude, s.latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      ) AS distance
    FROM shelter s
    WHERE ST_DWithin(
      ST_SetSRID(ST_MakePoint(s.longitude, s.latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
      $3
    )
    ${typeFilter}
    ORDER BY distance ASC
    LIMIT $4
  `,
    ...params,
  );

  logger.info({ count: shelters.length, radiusMeters, shelterType }, 'Nearby shelters retrieved');
  return shelters;
};

export const getSheltersByRegion = async (
  sidoName: string,
  sigunguName: string | null = null,
  shelterType: string | null = null,
) => {
  const where: Record<string, unknown> = { sidoName };
  if (sigunguName) where.sigunguName = sigunguName;
  if (shelterType) where.shelterType = shelterType;

  return prisma.shelter.findMany({
    where,
    orderBy: { name: 'asc' },
  });
};

export const getSheltersForOffline = async (
  sidoName: string,
  shelterType: string | null = null,
) => {
  const where: Record<string, unknown> = { sidoName };
  if (shelterType) where.shelterType = shelterType;

  return prisma.shelter.findMany({
    where,
    select: {
      shelterId: true,
      name: true,
      address: true,
      shelterType: true,
      longitude: true,
      latitude: true,
      capacity: true,
      phone: true,
    },
    orderBy: { name: 'asc' },
  });
};
