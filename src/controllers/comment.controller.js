import * as commentService from '../services/comment.service.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';

/*
댓글 컨트롤러
*/

// POST /api/posts/:postId/comments - 댓글 작성
export const createComment = async (req, res) => {
  const { userId } = req.user;
  const { postId } = req.params;
  const { contents, parentId } = req.body;

  if (!contents || contents.trim() === '') {
    return errorResponse(res, '댓글 내용을 입력해주세요.', null, 400);
  }

  try {
    const comment = await commentService.createComment(
      postId,
      userId,
      contents.trim(),
      parentId || null
    );
    return successResponse(res, '댓글 작성 성공', comment, 201);
  } catch (err) {
    console.error('Error creating comment:', err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// GET /api/posts/:postId/comments - 댓글 목록 조회
export const getComments = async (req, res) => {
  const { postId } = req.params;

  try {
    const comments = await commentService.getCommentsByPostId(postId);
    const count = await commentService.getCommentCountByPostId(postId);
    return successResponse(res, '댓글 조회 성공', { comments, count }, 200);
  } catch (err) {
    console.error('Error fetching comments:', err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// PUT /api/comments/:commentId - 댓글 수정
export const updateComment = async (req, res) => {
  const { userId } = req.user;
  const { commentId } = req.params;
  const { contents } = req.body;

  if (!contents || contents.trim() === '') {
    return errorResponse(res, '댓글 내용을 입력해주세요.', null, 400);
  }

  try {
    // 댓글 존재 및 권한 확인
    const existingComment = await commentService.getCommentById(commentId);
    if (!existingComment) {
      return errorResponse(res, '댓글을 찾을 수 없습니다.', null, 404);
    }
    if (existingComment.userId !== userId) {
      return errorResponse(res, '수정 권한이 없습니다.', null, 403);
    }

    const comment = await commentService.updateComment(commentId, contents.trim());
    return successResponse(res, '댓글 수정 성공', comment, 200);
  } catch (err) {
    console.error('Error updating comment:', err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// DELETE /api/comments/:commentId - 댓글 삭제
export const deleteComment = async (req, res) => {
  const { userId } = req.user;
  const { commentId } = req.params;

  try {
    // 댓글 존재 및 권한 확인
    const existingComment = await commentService.getCommentById(commentId);
    if (!existingComment) {
      return errorResponse(res, '댓글을 찾을 수 없습니다.', null, 404);
    }
    if (existingComment.userId !== userId) {
      return errorResponse(res, '삭제 권한이 없습니다.', null, 403);
    }

    await commentService.deleteComment(commentId);
    return successResponse(res, '댓글 삭제 성공', null, 200);
  } catch (err) {
    console.error('Error deleting comment:', err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};
