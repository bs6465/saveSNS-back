import * as trafficService from '../services/traffic.service.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';

/*
교통정보 컨트롤러
*/

// GET /api/traffic/incidents - 주변 돌발상황 조회
export const getIncidents = async (req, res) => {
  const { userId } = req.user;
  const radius = parseInt(req.query.radius) || 5000;

  try {
    const incidents = await trafficService.getIncidentsByUserId(userId, radius);
    return successResponse(res, '돌발상황 조회 성공', incidents, 200);
  } catch (err) {
    console.error('Error fetching traffic incidents:', err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// GET /api/traffic/road - 주변 도로 소통정보 조회
export const getRoadTraffic = async (req, res) => {
  const { userId } = req.user;
  const radius = parseInt(req.query.radius) || 5000;

  try {
    const roadTraffic = await trafficService.getRoadTrafficByUserId(userId, radius);
    return successResponse(res, '도로 소통정보 조회 성공', roadTraffic, 200);
  } catch (err) {
    console.error('Error fetching road traffic:', err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// GET /api/traffic/summary - 교통 요약 정보 조회
export const getTrafficSummary = async (req, res) => {
  const { userId } = req.user;
  const radius = parseInt(req.query.radius) || 5000;

  try {
    const summary = await trafficService.getTrafficSummaryByUserId(userId, radius);
    return successResponse(res, '교통 요약 정보 조회 성공', summary, 200);
  } catch (err) {
    console.error('Error fetching traffic summary:', err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};
