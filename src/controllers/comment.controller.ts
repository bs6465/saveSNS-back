import type { Request, Response } from 'express';
import * as commentService from '../services/comment.service.ts';
import * as notificationService from '../services/notification.service.ts';
import * as pushService from '../services/push.service.ts';
import { prisma } from '../prismaClient.ts';
import { successResponse, errorResponse } from '../utils/response.utils.ts';
import logger from '../config/logger.ts';

interface AuthUser {
  userId: string;
  nickname?: string;
  username?: string;
}

export const createComment = async (req: Request, res: Response) => {
  const { userId, nickname, username } = (req as unknown as { user: AuthUser }).user;
  const postId = req.params.postId as string;
  const { contents, parentId } = req.body;

  if (!contents || contents.trim() === '') {
    return errorResponse(res, '댓글 내용을 입력해주세요.', null, 400);
  }

  try {
    const comment = await commentService.createComment(
      postId,
      userId,
      contents.trim(),
      parentId || null,
    );

    try {
      const post = await prisma.posts.findUnique({
        where: { post_id: postId },
        select: { user_id: true, contents: true },
      });

      if (post && post.user_id !== userId) {
        const commenterName = nickname || username || '익명';
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
          {
            type: 'comment',
            postId,
          },
        );
      }
    } catch (notifErr) {
      logger.error({ err: notifErr }, 'Failed to send comment notification');
    }

    return successResponse(res, '댓글 작성 성공', comment, 201);
  } catch (err) {
    logger.error({ err }, 'Error creating comment');
    return errorResponse(res, '서버 에러', null, 500);
  }
};

export const getComments = async (req: Request, res: Response) => {
  const postId = req.params.postId as string;

  try {
    const comments = await commentService.getCommentsByPostId(postId);
    const count = await commentService.getCommentCountByPostId(postId);
    return successResponse(res, '댓글 조회 성공', { comments, count }, 200);
  } catch (err) {
    logger.error({ err }, 'Error fetching comments');
    return errorResponse(res, '서버 에러', null, 500);
  }
};

export const updateComment = async (req: Request, res: Response) => {
  const { userId } = (req as unknown as { user: AuthUser }).user;
  const commentId = req.params.commentId as string;
  const { contents } = req.body;

  if (!contents || contents.trim() === '') {
    return errorResponse(res, '댓글 내용을 입력해주세요.', null, 400);
  }

  try {
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
    logger.error({ err }, 'Error updating comment');
    return errorResponse(res, '서버 에러', null, 500);
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  const { userId } = (req as unknown as { user: AuthUser }).user;
  const commentId = req.params.commentId as string;

  try {
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
    logger.error({ err }, 'Error deleting comment');
    return errorResponse(res, '서버 에러', null, 500);
  }
};
