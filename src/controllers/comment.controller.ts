import * as commentService from '../services/comment.service.ts';
import * as notificationService from '../services/notification.service.ts';
import * as pushService from '../services/push.service.ts';
import { prisma } from '../prismaClient.ts';
import { successResponse } from '../utils/response.utils.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';
import { ValidationError, NotFoundError, ForbiddenError } from '../errors/index.ts';
import logger from '../config/logger.ts';

export const createComment = asyncHandler(async (req, res) => {
  const { userId, nickname } = req.user!;
  const postId = req.params.postId as string;
  const { contents, parentId } = req.body;

  if (!contents || contents.trim() === '') {
    throw new ValidationError('댓글 내용을 입력해주세요.');
  }

  const comment = await commentService.createComment(
    postId,
    userId,
    contents.trim(),
    parentId || null,
  );

  // 알림 발송 (실패해도 댓글 생성에 영향 없음)
  try {
    const post = await prisma.posts.findUnique({
      where: { post_id: postId },
      select: { user_id: true, contents: true },
    });

    if (post && post.user_id !== userId) {
      const commenterName = nickname || '익명';
      const previewContent = contents.trim().slice(0, 30) + (contents.length > 30 ? '...' : '');

      await notificationService.createNotification(
        post.user_id,
        'comment',
        '새 댓글',
        `${commenterName}님이 댓글을 남겼습니다: ${previewContent}`,
        { postId, commentId: comment?.commentId },
      );

      await pushService.sendPushToUser(
        post.user_id,
        '새 댓글',
        `${commenterName}님이 댓글을 남겼습니다`,
        { type: 'comment', postId },
      );
    }
  } catch (notifErr) {
    logger.error({ err: notifErr }, 'Failed to send comment notification');
  }

  return successResponse(res, '댓글 작성 성공', comment, 201);
});

export const getComments = asyncHandler(async (req, res) => {
  const postId = req.params.postId as string;
  const comments = await commentService.getCommentsByPostId(postId);
  const count = await commentService.getCommentCountByPostId(postId);
  return successResponse(res, '댓글 조회 성공', { comments, count }, 200);
});

export const updateComment = asyncHandler(async (req, res) => {
  const { userId } = req.user!;
  const commentId = req.params.commentId as string;
  const { contents } = req.body;

  if (!contents || contents.trim() === '') {
    throw new ValidationError('댓글 내용을 입력해주세요.');
  }

  const existingComment = await commentService.getCommentById(commentId);
  if (!existingComment) {
    throw new NotFoundError('댓글');
  }
  if (existingComment.userId !== userId) {
    throw new ForbiddenError('수정 권한이 없습니다.');
  }

  const comment = await commentService.updateComment(commentId, contents.trim());
  return successResponse(res, '댓글 수정 성공', comment, 200);
});

export const deleteComment = asyncHandler(async (req, res) => {
  const { userId } = req.user!;
  const commentId = req.params.commentId as string;

  const existingComment = await commentService.getCommentById(commentId);
  if (!existingComment) {
    throw new NotFoundError('댓글');
  }
  if (existingComment.userId !== userId) {
    throw new ForbiddenError('삭제 권한이 없습니다.');
  }

  await commentService.deleteComment(commentId);
  return successResponse(res, '댓글 삭제 성공', null, 200);
});
