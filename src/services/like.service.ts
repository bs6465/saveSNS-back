import { prisma } from '../prismaClient.ts';

/*
좋아요 관련 로직
*/

export const toggleLike = async (postId: string, userId: string): Promise<{ liked: boolean }> => {
  const existingLike = await prisma.post_like.findUnique({
    where: {
      postId_userId: {
        postId,
        userId,
      },
    },
  });

  if (existingLike) {
    await prisma.post_like.delete({
      where: {
        likeId: existingLike.likeId,
      },
    });
    return { liked: false };
  } else {
    await prisma.post_like.create({
      data: {
        postId,
        userId,
      },
    });
    return { liked: true };
  }
};

export const getLikeCount = async (postId: string): Promise<number> => {
  const count = await prisma.post_like.count({
    where: { postId },
  });
  return count;
};

export const hasUserLiked = async (postId: string, userId: string): Promise<boolean> => {
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

export const getLikeInfo = async (
  postId: string,
  userId: string | null,
): Promise<{ count: number; liked: boolean }> => {
  const [count, liked] = await Promise.all([
    getLikeCount(postId),
    userId ? hasUserLiked(postId, userId) : false,
  ]);

  return { count, liked };
};

export const getLikedUsers = async (postId: string, limit: number = 20) => {
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

export const getLikedPostsByUserId = async (userId: string, limit: number = 20) => {
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
