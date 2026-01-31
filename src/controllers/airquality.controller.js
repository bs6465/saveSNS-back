import * as airqualityService from '../services/airquality.service.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';

/*
대기질 조회 로직
*/

// GET /api/airquality 사용자 위치 기반 대기질 조회
export const getAirQuality = async (req, res) => {
  const { userId } = req.user;

  try {
    const airQuality = await airqualityService.getAirQualityByUserId(userId);

    if (!airQuality) {
      return successResponse(res, '대기질 정보가 없습니다', null, 200);
    }

    return successResponse(res, '대기질 조회 성공', airQuality, 200);
  } catch (err) {
    console.error('Error fetching air quality:', err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// GET /api/airquality/:sidoName 시도별 대기질 조회
export const getAirQualityBySido = async (req, res) => {
  const { sidoName } = req.params;

  try {
    const airQuality = await airqualityService.getAirQualityBySido(sidoName);

    if (!airQuality) {
      return successResponse(res, '해당 지역의 대기질 정보가 없습니다', null, 200);
    }

    return successResponse(res, '대기질 조회 성공', airQuality, 200);
  } catch (err) {
    console.error('Error fetching air quality by sido:', err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};
