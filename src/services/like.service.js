import { prisma } from '../prismaClient.js';

/*
좋아요 관련 로직
*/

// 좋아요 토글 (좋아요가 있으면 취소, 없으면 추가)
export const toggleLike = async (postId, userId) => {
  const existingLike = await prisma.post_like.findUnique({
    where: {
      postId_userId: {
        postId,
        userId,
      },
    },
  });

  if (existingLike) {
    // 좋아요 취소
    await prisma.post_like.delete({
      where: {
        likeId: existingLike.likeId,
      },
    });
    return { liked: false };
  } else {
    // 좋아요 추가
    await prisma.post_like.create({
      data: {
        postId,
        userId,
      },
    });
    return { liked: true };
  }
};

// 게시글 좋아요 수 조회
export const getLikeCount = async (postId) => {
  const count = await prisma.post_like.count({
    where: { postId },
  });
  return count;
};

// 사용자가 해당 게시글에 좋아요를 눌렀는지 확인
export const hasUserLiked = async (postId, userId) => {
  const like = await prisma.post_like.findUnique({
    where: {
      postId_userId: {
        postId,
        userId,
      },
    },
  });
  return !!like;
};

// 게시글 좋아요 정보 조회 (좋아요 수 + 현재 사용자 좋아요 여부)
export const getLikeInfo = async (postId, userId) => {
  const [count, liked] = await Promise.all([
    getLikeCount(postId),
    userId ? hasUserLiked(postId, userId) : false,
  ]);

  return { count, liked };
};

// 좋아요한 사용자 목록 조회
export const getLikedUsers = async (postId, limit = 20) => {
  const likes = await prisma.post_like.findMany({
    where: { postId },
    include: {
      user: {
        select: {
          user_id: true,
          username: true,
          nickname: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });

  return likes.map((like) => ({
    userId: like.user.user_id,
    username: like.user.username,
    nickname: like.user.nickname,
  }));
};

// 사용자가 좋아요한 게시글 목록 조회
export const getLikedPostsByUserId = async (userId, limit = 20) => {
  const likes = await prisma.post_like.findMany({
    where: { userId },
    include: {
      post: {
        include: {
          users_account: {
            select: {
              user_id: true,
              username: true,
              nickname: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });

  return likes.map((like) => ({
    postId: like.post.post_id,
    contents: like.post.contents,
    createdAt: like.post.created_at,
    user: {
      userId: like.post.users_account.user_id,
      username: like.post.users_account.username,
      nickname: like.post.users_account.nickname,
    },
  }));
};
