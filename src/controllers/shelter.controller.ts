import * as shelterService from '../services/shelter.service.ts';
import { successResponse } from '../utils/response.utils.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';

export const getNearbyShelters = asyncHandler(async (req, res) => {
  const { longitude, latitude, radiusMeters, shelterType, limit } = (
    req as unknown as { validatedQuery: Record<string, unknown> }
  ).validatedQuery;
  const data = await shelterService.getNearbyShelters(
    longitude as number,
    latitude as number,
    radiusMeters as number,
    shelterType as string | null,
    limit as number,
  );
  return successResponse(res, '주변 대피소 조회 성공', data);
});

export const getSheltersByRegion = asyncHandler(async (req, res) => {
  const { sidoName, sigunguName, shelterType } = (
    req as unknown as { validatedQuery: Record<string, unknown> }
  ).validatedQuery;
  const data = await shelterService.getSheltersByRegion(
    sidoName as string,
    sigunguName as string | null,
    shelterType as string | null,
  );
  return successResponse(res, '지역별 대피소 조회 성공', data);
});

export const getSheltersForOffline = asyncHandler(async (req, res) => {
  const { sidoName, shelterType } = (req as unknown as { validatedQuery: Record<string, unknown> })
    .validatedQuery;
  const data = await shelterService.getSheltersForOffline(
    sidoName as string,
    shelterType as string | null,
  );
  return successResponse(res, '오프라인 대피소 데이터 조회 성공', data);
});
