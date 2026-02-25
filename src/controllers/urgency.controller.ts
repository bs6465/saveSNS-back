import * as urgencyService from '../services/urgencyAnalyzer.service.ts';
import { successResponse } from '../utils/response.utils.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';
import { NotFoundError } from '../errors/index.ts';

export const getUrgencyReports = asyncHandler(async (req, res) => {
  const { longitude, latitude, radiusMeters, limit } = req.validatedQuery!;

  const reports = await urgencyService.getUrgencyReports(
    longitude as number,
    latitude as number,
    radiusMeters as number,
    limit as number,
  );
  return successResponse(res, '긴급 리포트 조회 성공', reports);
});

export const submitFeedback = asyncHandler(async (req, res) => {
  const { reportId } = req.validatedParams!;
  const { userId } = req.user!;
  const { action } = req.body;

  const result = await urgencyService.submitFeedback(reportId as string, userId, action);
  if (!result) {
    throw new NotFoundError('리포트');
  }

  const message = action === 'confirm' ? '확인 처리되었습니다' : '신고 접수되었습니다';
  return successResponse(res, message, result);
});
