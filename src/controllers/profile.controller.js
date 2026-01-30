// post.controller.js
import * as profileService from '../services/profile.service.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
// import { getIo } from '../websocket';

/*
프로필 조회, 수정 로직, 위치 정보 저장
*/

// GET /api/profile/ 내 프로필 정보 가져오기
export const getProfile = async (req, res) => {
  const { userId } = req.user;
  try {
    const profile = await profileService.getProfile(userId);
    return successResponse(res, '프로필 조회 성공', profile, 200);
  } catch (err) {
    console.error(err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};



// POST /api/profile/location 위치 정보 저장
export const setLocation = async (req, res) => {
  const { userId } = req.user;
  const { longitude, latitude } = req.body;
  try {
    await profileService.setLocation(userId, longitude, latitude);
    return successResponse(res, '위치 정보 저장 성공', null, 200);
  } catch (err) {
    console.error(err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// PATCH /api/profile 프로필 수정
export const updateProfile = async (req, res) => {
  const { userId } = req.user;
  const { nickname } = req.body;

  try {
    if (!nickname || !nickname.trim()) {
      return errorResponse(res, '닉네임을 입력해주세요', null, 400);
    }

    const updatedProfile = await profileService.updateProfile(userId, nickname.trim());
    return successResponse(res, '프로필 수정 성공', updatedProfile, 200);
  } catch (err) {
    console.error(err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// GET /api/profile/posts 내 게시글 목록 조회
export const getUserPosts = async (req, res) => {
  const { userId } = req.user;

  try {
    const posts = await profileService.getUserPosts(userId);
    return successResponse(res, '내 게시글 조회 성공', posts, 200);
  } catch (err) {
    console.error(err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};