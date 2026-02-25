import * as trafficService from '../services/traffic.service.ts';
import { successResponse } from '../utils/response.utils.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';

export const getIncidents = asyncHandler(async (req, res) => {
  const radius = parseInt(req.query.radius as string) || 5000;
  const incidents = await trafficService.getIncidentsByUserId(req.user!.userId, radius);
  return successResponse(res, '돌발상황 조회 성공', incidents, 200);
});

export const getRoadTraffic = asyncHandler(async (req, res) => {
  const radius = parseInt(req.query.radius as string) || 5000;
  const roadTraffic = await trafficService.getRoadTrafficByUserId(req.user!.userId, radius);
  return successResponse(res, '도로 소통정보 조회 성공', roadTraffic, 200);
});

export const getTrafficSummary = asyncHandler(async (req, res) => {
  const radius = parseInt(req.query.radius as string) || 5000;
  const summary = await trafficService.getTrafficSummaryByUserId(req.user!.userId, radius);
  return successResponse(res, '교통 요약 정보 조회 성공', summary, 200);
});
