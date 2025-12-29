// post.controller.js
import * as profileService from '../services/profile.service.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
// import { getIo } from '../websocket';

/*
프로필 조회, 수정 로직, 위치 정보 저장
*/

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