import * as urgencyService from '../services/urgencyAnalyzer.service.ts';
import { successResponse } from '../utils/response.utils.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';

export const getUrgencyReports = asyncHandler(async (req, res) => {
  const { longitude, latitude, radiusMeters, limit } = (
    req as unknown as { validatedQuery: Record<string, unknown> }
  ).validatedQuery;

  const reports = await urgencyService.getUrgencyReports(
    longitude as number,
    latitude as number,
    radiusMeters as number,
    limit as number,
  );
  return successResponse(res, '긴급 리포트 조회 성공', reports);
});

export const submitFeedback = asyncHandler(async (req, res) => {
  const { reportId } = (req as unknown as { validatedParams: Record<string, unknown> })
    .validatedParams;
  const { userId } = (req as unknown as { user: { userId: string } }).user;
  const { action } = req.body;

  const result = await urgencyService.submitFeedback(reportId as string, userId, action);
  if (!result) {
    return res.status(404).json({ success: false, message: '리포트를 찾을 수 없습니다' });
  }

  const message = action === 'confirm' ? '확인 처리되었습니다' : '신고 접수되었습니다';
  return successResponse(res, message, result);
});
