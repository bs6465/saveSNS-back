import { z } from 'zod';

const shelterTypeEnum = z.enum([
  'civil_defense',
  'earthquake',
  'earthquake_outdoor',
  'tsunami',
  'cold_wave',
  'heat_wave',
]);

export const nearbySheltersQuery = z.object({
  longitude: z.coerce.number().min(-180).max(180),
  latitude: z.coerce.number().min(-90).max(90),
  radiusMeters: z.coerce.number().int().min(100).max(50000).default(5000),
  shelterType: shelterTypeEnum.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const sheltersByRegionQuery = z.object({
  sidoName: z.string().min(1).max(40),
  sigunguName: z.string().max(40).optional(),
  shelterType: shelterTypeEnum.optional(),
});

export const offlineDownloadQuery = z.object({
  sidoName: z.string().min(1).max(40),
  shelterType: shelterTypeEnum.optional(),
});
