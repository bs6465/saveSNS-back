// weather.controller.js
import * as weatherService from '../services/weather.service.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
// import { getIo } from '../websocket';

/*
날씨 조회 로직
*/

// GET /api/weather/ultrashort 초단기 예보 조회
export const getUltraShortTermForecast = async (req, res) => {
  const { userId } = req.user;
  try {
    const forecasts = await weatherService.getUltraShortTermForecast(userId);
    return successResponse(res, '초단기 예보 조회 성공', forecasts, 200);
  } catch (err) {
    console.error(err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};