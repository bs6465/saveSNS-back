import * as likeService from '../services/like.service.js';
import * as notificationService from '../services/notification.service.js';
import * as pushService from '../services/push.service.js';
import { prisma } from '../prismaClient.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';

/*
좋아요 컨트롤러
*/

// POST /api/posts/:postId/like - 좋아요 토글
export const toggleLike = async (req, res) => {
  const { userId, nickname, username } = req.user;
  const { postId } = req.params;

  try {
    const result = await likeService.toggleLike(postId, userId);
    const likeInfo = await likeService.getLikeInfo(postId, userId);

    // 좋아요 추가 시에만 알림 전송 (자신의 글에 자신이 좋아요한 경우 제외)
    if (result.liked) {
      try {
        const post = await prisma.posts.findUnique({
          where: { post_id: postId },
          select: { user_id: true },
        });

        if (post && post.user_id !== userId) {
          const likerName = nickname || username || '익명';

          // 알림 저장
          await notificationService.createNotification(
            post.user_id,
            'like',
            '좋아요',
            `${likerName}님이 게시글을 좋아합니다`,
            { postId }
          );

          // 푸시 알림 전송
          await pushService.sendPushToUser(post.user_id, '좋아요', `${likerName}님이 게시글을 좋아합니다`, {
            type: 'like',
            postId,
          });
        }
      } catch (notifErr) {
        console.error('Error sending like notification:', notifErr);
        // 알림 실패해도 좋아요는 성공 처리
      }
    }

    return successResponse(
      res,
      result.liked ? '좋아요 추가' : '좋아요 취소',
      likeInfo,
      200
    );
  } catch (err) {
    console.error('Error toggling like:', err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// GET /api/posts/:postId/likes - 좋아요 정보 조회
export const getLikeInfo = async (req, res) => {
  const userId = req.user?.userId || null;
  const { postId } = req.params;

  try {
    const likeInfo = await likeService.getLikeInfo(postId, userId);
    return successResponse(res, '좋아요 정보 조회 성공', likeInfo, 200);
  } catch (err) {
    console.error('Error fetching like info:', err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// GET /api/posts/:postId/likes/users - 좋아요한 사용자 목록 조회
export const getLikedUsers = async (req, res) => {
  const { postId } = req.params;
  const limit = parseInt(req.query.limit) || 20;

  try {
    const users = await likeService.getLikedUsers(postId, limit);
    return successResponse(res, '좋아요 사용자 목록 조회 성공', users, 200);
  } catch (err) {
    console.error('Error fetching liked users:', err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};
