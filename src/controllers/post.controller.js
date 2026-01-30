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
  const { contents, longitude, latitude, mediaUrls } = req.body;

  try {
    const data = await postService.createPost(userId, contents, longitude, latitude, mediaUrls);
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

// GET /api/posts/:postId 글 상세 조회
export const getPostById = async (req, res) => {
  const { postId } = req.params;

  try {
    const post = await postService.getPostById(postId);
    return successResponse(res, '글 상세 조회 성공', post, 200);
  } catch (err) {
    console.error(err);
    if (err.message === 'Post not found') {
      return errorResponse(res, '게시글을 찾을 수 없습니다', null, 404);
    }
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// PUT /api/posts/:postId 글 수정
export const updatePost = async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.user;
  const { contents } = req.body;

  try {
    const updatedPost = await postService.updatePost(postId, userId, contents);
    return successResponse(res, '글 수정 성공', updatedPost, 200);
  } catch (err) {
    console.error(err);
    if (err.message === 'POST_NOT_FOUND') {
      return errorResponse(res, '게시글을 찾을 수 없습니다', null, 404);
    }
    if (err.message === 'UNAUTHORIZED') {
      return errorResponse(res, '본인의 게시글만 수정할 수 있습니다', null, 403);
    }
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// DELETE /api/posts/:postId 글 삭제
export const deletePost = async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.user;

  try {
    const deletedPost = await postService.deletePost(postId, userId);
    return successResponse(res, '글 삭제 성공', deletedPost, 200);
  } catch (err) {
    console.error(err);
    if (err.message === 'POST_NOT_FOUND') {
      return errorResponse(res, '게시글을 찾을 수 없습니다', null, 404);
    }
    if (err.message === 'UNAUTHORIZED') {
      return errorResponse(res, '본인의 게시글만 삭제할 수 있습니다', null, 403);
    }
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// GET /api/posts/:postId 거리 계산