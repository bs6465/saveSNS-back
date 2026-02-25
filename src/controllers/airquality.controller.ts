import * as airqualityService from '../services/airquality.service.ts';
import { successResponse } from '../utils/response.utils.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';

export const getAirQuality = asyncHandler(async (req, res) => {
  const airQuality = await airqualityService.getAirQualityByUserId(req.user!.userId);
  if (!airQuality) {
    return successResponse(res, '대기질 정보가 없습니다', null, 200);
  }
  return successResponse(res, '대기질 조회 성공', airQuality, 200);
});

export const getAirQualityBySido = asyncHandler(async (req, res) => {
  const sidoName = req.params.sidoName as string;
  const airQuality = await airqualityService.getAirQualityBySido(sidoName);
  if (!airQuality) {
    return successResponse(res, '해당 지역의 대기질 정보가 없습니다', null, 200);
  }
  return successResponse(res, '대기질 조회 성공', airQuality, 200);
});
