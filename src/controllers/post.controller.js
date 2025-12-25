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
  const { title, content } = req.body;

  if (!userId) {
    return errorResponse(res, '로그인이 필요합니다.', null, 401);
  }
  if (!title || !content) {
    return errorResponse(res, '필수 입력값이 누락되었습니다.', null, 400);
  }
  try {
    const data = await post.createPost(userId, title, content);
    return successResponse(res, '글 작성 성공', data, 201);
  } catch (err) {
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// GET /api/posts/ 글 목록 조회
export const getPosts = async (req, res) => {
  try {
    const posts = await post.getAllPosts();
    return successResponse(res, '글 목록 조회 성공', posts, 200);
  } catch (err) {
    return errorResponse(res, '서버 에러', null, 500);
  }
};
