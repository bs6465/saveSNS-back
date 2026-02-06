// post.controller.js
import * as postService from '../services/post.service.js';
import { successResponse } from '../utils/response.utils.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
// import { getIo } from '../websocket';

/*
글 작성, 조회, 수정, 삭제 로직
asyncHandler를 사용하여 에러를 자동으로 글로벌 에러 핸들러로 전달
*/

// POST /api/posts/ 글 작성
export const createPost = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { contents, longitude, latitude, mediaUrls } = req.body;

  console.log('=== 게시글 작성 요청 ===');
  console.log('mediaUrls:', mediaUrls);

  const data = await postService.createPost(userId, contents, longitude, latitude, mediaUrls);
  return successResponse(res, '글 작성 성공', data, 201);
});

// GET /api/posts/ 글 목록 조회
export const getPosts = asyncHandler(async (req, res) => {
  const { longitude, latitude, rangeMeters } = req.validatedQuery;

  const posts = await postService.getPosts(longitude, latitude, rangeMeters);
  return successResponse(res, '글 목록 조회 성공', posts, 200);
});

// GET /api/posts/all 글 전체 조회
export const getAllPosts = asyncHandler(async (req, res) => {
  const posts = await postService.getAllPosts();
  return successResponse(res, '글 목록 조회 성공', posts, 200);
});

// GET /api/posts/:postId 글 상세 조회
export const getPostById = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const post = await postService.getPostById(postId);
  return successResponse(res, '글 상세 조회 성공', post, 200);
});

// PUT /api/posts/:postId 글 수정
export const updatePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.user;
  const { contents } = req.body;

  const updatedPost = await postService.updatePost(postId, userId, contents);
  return successResponse(res, '글 수정 성공', updatedPost, 200);
});

// DELETE /api/posts/:postId 글 삭제
export const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.user;

  const deletedPost = await postService.deletePost(postId, userId);
  return successResponse(res, '글 삭제 성공', deletedPost, 200);
});
