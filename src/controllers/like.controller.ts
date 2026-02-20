import type { Request, Response } from 'express';
import * as likeService from '../services/like.service.ts';
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

export const toggleLike = async (req: Request, res: Response) => {
  const { userId, nickname, username } = (req as unknown as { user: AuthUser }).user;
  const postId = req.params.postId as string;

  try {
    const result = await likeService.toggleLike(postId, userId);
    const likeInfo = await likeService.getLikeInfo(postId, userId);

    if (result.liked) {
      try {
        const post = await prisma.posts.findUnique({
          where: { post_id: postId },
          select: { user_id: true },
        });

        if (post && post.user_id !== userId) {
          const likerName = nickname || username || '익명';

          await notificationService.createNotification(
            post.user_id,
            'like',
            '좋아요',
            `${likerName}님이 게시글을 좋아합니다`,
            { postId },
          );

          await pushService.sendPushToUser(
            post.user_id,
            '좋아요',
            `${likerName}님이 게시글을 좋아합니다`,
            {
              type: 'like',
              postId,
            },
          );
        }
      } catch (notifErr) {
        logger.error({ err: notifErr }, 'Failed to send like notification');
      }
    }

    return successResponse(res, result.liked ? '좋아요 추가' : '좋아요 취소', likeInfo, 200);
  } catch (err) {
    logger.error({ err }, 'Error toggling like');
    return errorResponse(res, '서버 에러', null, 500);
  }
};

export const getLikeInfo = async (req: Request, res: Response) => {
  const userId = (req as unknown as { user?: AuthUser }).user?.userId || null;
  const postId = req.params.postId as string;

  try {
    const likeInfo = await likeService.getLikeInfo(postId, userId);
    return successResponse(res, '좋아요 정보 조회 성공', likeInfo, 200);
  } catch (err) {
    logger.error({ err }, 'Error fetching like info');
    return errorResponse(res, '서버 에러', null, 500);
  }
};

export const getLikedUsers = async (req: Request, res: Response) => {
  const postId = req.params.postId as string;
  const limit = parseInt(req.query.limit as string) || 20;

  try {
    const users = await likeService.getLikedUsers(postId, limit);
    return successResponse(res, '좋아요 사용자 목록 조회 성공', users, 200);
  } catch (err) {
    logger.error({ err }, 'Error fetching liked users');
    return errorResponse(res, '서버 에러', null, 500);
  }
};
