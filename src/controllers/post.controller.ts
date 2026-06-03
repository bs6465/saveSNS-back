import * as postService from '../services/post.service.ts';
import { successResponse } from '../utils/response.utils.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';
import logger from '../config/logger.ts';
import { emitToLocation } from '../config/socket.ts';

export const createPost = asyncHandler(async (req, res) => {
  const { userId } = req.user!;
  const { contents, longitude, latitude, mediaUrls, mediaFiles } = req.body;

  logger.info({ mediaCount: (mediaFiles || mediaUrls || []).length }, 'Post creation requested');

  const data = await postService.createPost(
    userId,
    contents,
    longitude,
    latitude,
    mediaUrls,
    mediaFiles,
  );

  // Socket.IO로 위치 기반 새 글 알림 브로드캐스트
  if (longitude && latitude) {
    emitToLocation(latitude, longitude, 'post:new', {
      postId: data.postId,
      userId,
      preview: contents?.slice(0, 50),
    });
  }

  return successResponse(res, '글 작성 성공', data, 201);
});

export const getPosts = asyncHandler(async (req, res) => {
  const { longitude, latitude, rangeMeters, cursor, limit, sortBy } = req.validatedQuery!;

  const result = await postService.getPosts(
    longitude as number,
    latitude as number,
    rangeMeters as number,
    (cursor as string) || null,
    limit as number,
    sortBy as string,
  );
  return successResponse(res, '글 목록 조회 성공', result, 200);
});

export const getAllPosts = asyncHandler(async (_req, res) => {
  const posts = await postService.getAllPosts();
  return successResponse(res, '글 목록 조회 성공', posts, 200);
});

export const getPostById = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const post = await postService.getPostById(postId as string);
  return successResponse(res, '글 상세 조회 성공', post, 200);
});

export const updatePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.user!;
  const { contents } = req.body;

  const updatedPost = await postService.updatePost(postId as string, userId, contents);
  return successResponse(res, '글 수정 성공', updatedPost, 200);
});

export const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.user!;

  const deletedPost = await postService.deletePost(postId as string, userId);
  return successResponse(res, '글 삭제 성공', deletedPost, 200);
});
