import * as profileService from '../services/profile.service.ts';
import { successResponse } from '../utils/response.utils.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';
import { ValidationError } from '../errors/index.ts';

export const getProfile = asyncHandler(async (req, res) => {
  const profile = await profileService.getProfile(req.user!.userId);
  return successResponse(res, '프로필 조회 성공', profile, 200);
});

export const setLocation = asyncHandler(async (req, res) => {
  const { longitude, latitude } = req.body;
  await profileService.setLocation(req.user!.userId, longitude, latitude);
  return successResponse(res, '위치 정보 저장 성공', null, 200);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { nickname } = req.body;

  if (!nickname || !nickname.trim()) {
    throw new ValidationError('닉네임을 입력해주세요');
  }

  const updatedProfile = await profileService.updateProfile(req.user!.userId, nickname.trim());
  return successResponse(res, '프로필 수정 성공', updatedProfile, 200);
});

export const getUserPosts = asyncHandler(async (req, res) => {
  const posts = await profileService.getUserPosts(req.user!.userId);
  return successResponse(res, '내 게시글 조회 성공', posts, 200);
});
