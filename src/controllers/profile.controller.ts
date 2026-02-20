import type { Request, Response } from 'express';
import * as profileService from '../services/profile.service.ts';
import { successResponse, errorResponse } from '../utils/response.utils.ts';
import logger from '../config/logger.ts';

export const getProfile = async (req: Request, res: Response) => {
  const { userId } = (req as unknown as { user: { userId: string } }).user;
  try {
    const profile = await profileService.getProfile(userId);
    return successResponse(res, '프로필 조회 성공', profile, 200);
  } catch (err) {
    logger.error({ err }, 'Profile operation failed');
    return errorResponse(res, '서버 에러', null, 500);
  }
};

export const setLocation = async (req: Request, res: Response) => {
  const { userId } = (req as unknown as { user: { userId: string } }).user;
  const { longitude, latitude } = req.body;
  try {
    await profileService.setLocation(userId, longitude, latitude);
    return successResponse(res, '위치 정보 저장 성공', null, 200);
  } catch (err) {
    logger.error({ err }, 'Profile operation failed');
    return errorResponse(res, '서버 에러', null, 500);
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  const { userId } = (req as unknown as { user: { userId: string } }).user;
  const { nickname } = req.body;

  try {
    if (!nickname || !nickname.trim()) {
      return errorResponse(res, '닉네임을 입력해주세요', null, 400);
    }

    const updatedProfile = await profileService.updateProfile(userId, nickname.trim());
    return successResponse(res, '프로필 수정 성공', updatedProfile, 200);
  } catch (err) {
    logger.error({ err }, 'Profile operation failed');
    return errorResponse(res, '서버 에러', null, 500);
  }
};

export const getUserPosts = async (req: Request, res: Response) => {
  const { userId } = (req as unknown as { user: { userId: string } }).user;

  try {
    const posts = await profileService.getUserPosts(userId);
    return successResponse(res, '내 게시글 조회 성공', posts, 200);
  } catch (err) {
    logger.error({ err }, 'Profile operation failed');
    return errorResponse(res, '서버 에러', null, 500);
  }
};
