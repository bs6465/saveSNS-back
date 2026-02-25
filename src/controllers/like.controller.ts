import * as likeService from '../services/like.service.ts';
import * as notificationService from '../services/notification.service.ts';
import * as pushService from '../services/push.service.ts';
import { prisma } from '../prismaClient.ts';
import { successResponse } from '../utils/response.utils.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';
import logger from '../config/logger.ts';

export const toggleLike = asyncHandler(async (req, res) => {
  const { userId, nickname, username } = req.user!;
  const postId = req.params.postId as string;

  const result = await likeService.toggleLike(postId, userId);
  const likeInfo = await likeService.getLikeInfo(postId, userId);

  if (result.liked) {
    // 알림 발송 (실패해도 좋아요에 영향 없음)
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
          { type: 'like', postId },
        );
      }
    } catch (notifErr) {
      logger.error({ err: notifErr }, 'Failed to send like notification');
    }
  }

  return successResponse(res, result.liked ? '좋아요 추가' : '좋아요 취소', likeInfo, 200);
});

export const getLikeInfo = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || null;
  const postId = req.params.postId as string;

  const likeInfo = await likeService.getLikeInfo(postId, userId);
  return successResponse(res, '좋아요 정보 조회 성공', likeInfo, 200);
});

export const getLikedUsers = asyncHandler(async (req, res) => {
  const postId = req.params.postId as string;
  const limit = parseInt(req.query.limit as string) || 20;

  const users = await likeService.getLikedUsers(postId, limit);
  return successResponse(res, '좋아요 사용자 목록 조회 성공', users, 200);
});
