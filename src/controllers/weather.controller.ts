import * as weatherService from '../services/weather.service.ts';
import { successResponse } from '../utils/response.utils.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';

export const getUltraShortTermForecast = asyncHandler(async (req, res) => {
  const forecasts = await weatherService.getUltraShortTermForecast(req.user!.userId);
  return successResponse(res, '초단기 예보 조회 성공', forecasts, 200);
});
