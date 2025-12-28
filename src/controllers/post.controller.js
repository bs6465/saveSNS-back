// post.controller.js
import * as post from '../services/auth.service.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
// import { getIo } from '../websocket';

/*
글 작성, 조회, 수정, 삭제 로직
*/

// POST /api/posts/ 글 작성
export const createPost = async (req, res) => {
  const { userId } = req.user;
  const { content, longitude, latitude } = req.body;

  if (!content || !longitude || !latitude) {
    return errorResponse(res, '필수 입력값이 누락되었습니다.', null, 400);
  }
  try {
    const data = await post.createPost(userId, content, longitude, latitude);
    return successResponse(res, '글 작성 성공', data, 201);
  } catch (err) {
    console.error(err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// GET /api/posts/ 글 목록 조회
export const getPosts = async (req, res) => {
  const { longitude, latitude, rangeMeters } = req.body;
  // 유효성 체크. 더 나은 라이브러리 사용 권장 (유효, 타입 등)
  if (!longitude || !latitude || !rangeMeters) {
    return errorResponse(res, '필수 입력값이 누락되었습니다.', null, 400);
  }

  try {
    const posts = await post.getPosts(longitude, latitude, rangeMeters);
    return successResponse(res, '글 목록 조회 성공', posts, 200);
  } catch (err) {
    console.error(err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// GET /api/posts/all 글 전체 조회
export const getAllPosts = async (req, res) => {
  try {
    const posts = await post.getAllPosts();
    return successResponse(res, '글 목록 조회 성공', posts, 200);
  } catch (err) {
    console.error(err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};
