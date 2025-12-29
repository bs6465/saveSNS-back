// post.controller.js
import * as postService from '../services/post.service.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
// import { getIo } from '../websocket';

/*
글 작성, 조회, 수정, 삭제 로직
*/

// POST /api/posts/ 글 작성
export const createPost = async (req, res) => {
  const { userId } = req.user;
  const { contents, longitude, latitude } = req.body;

  try {
    const data = await postService.createPost(userId, contents, longitude, latitude);
    return successResponse(res, '글 작성 성공', data, 201);
  } catch (err) {
    console.error(err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// GET /api/posts/ 글 목록 조회
export const getPosts = async (req, res) => {
  const { longitude, latitude, rangeMeters } = req.validatedQuery;

  try {
    const posts = await postService.getPosts(longitude, latitude, rangeMeters);
    return successResponse(res, '글 목록 조회 성공', posts, 200);
  } catch (err) {
    console.error(err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// GET /api/posts/all 글 전체 조회
export const getAllPosts = async (req, res) => {
  try {
    const posts = await postService.getAllPosts();
    return successResponse(res, '글 목록 조회 성공', posts, 200);
  } catch (err) {
    console.error(err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};
