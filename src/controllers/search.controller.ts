import * as searchService from '../services/search.service.ts';
import { successResponse } from '../utils/response.utils.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';

export const searchPosts = asyncHandler(async (req, res) => {
  const { q, longitude, latitude, rangeMeters, cursor, limit } = req.validatedQuery!;
  const result = await searchService.searchPosts(q as string, {
    longitude: longitude as number,
    latitude: latitude as number,
    rangeMeters: rangeMeters as number,
    cursor: cursor as string,
    limit: limit as number,
  });
  return successResponse(res, '게시글 검색 성공', result, 200);
});

export const searchUsers = asyncHandler(async (req, res) => {
  const { q, cursor, limit } = req.validatedQuery!;
  const result = await searchService.searchUsers(q as string, cursor as string, limit as number);
  return successResponse(res, '사용자 검색 성공', result, 200);
});
