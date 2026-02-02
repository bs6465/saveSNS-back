import { prisma } from '../prismaClient.js';

/*
좋아요 관련 로직
*/

// 좋아요 토글 (좋아요가 있으면 취소, 없으면 추가)
export const toggleLike = async (postId, userId) => {
  const existingLike = await prisma.postLike.findUnique({
    where: {
      postId_userId: {
        postId,
        userId,
      },
    },
  });

  if (existingLike) {
    // 좋아요 취소
    await prisma.postLike.delete({
      where: {
        likeId: existingLike.likeId,
      },
    });
    return { liked: false };
  } else {
    // 좋아요 추가
    await prisma.postLike.create({
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
  const count = await prisma.postLike.count({
    where: { postId },
  });
  return count;
};

// 사용자가 해당 게시글에 좋아요를 눌렀는지 확인
export const hasUserLiked = async (postId, userId) => {
  const like = await prisma.postLike.findUnique({
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
  const likes = await prisma.postLike.findMany({
    where: { postId },
    include: {
      user: {
        select: {
          userId: true,
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

  return likes.map((like) => like.user);
};

// 사용자가 좋아요한 게시글 목록 조회
export const getLikedPostsByUserId = async (userId, limit = 20) => {
  const likes = await prisma.postLike.findMany({
    where: { userId },
    include: {
      post: {
        include: {
          user: {
            select: {
              userId: true,
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

  return likes.map((like) => like.post);
};
