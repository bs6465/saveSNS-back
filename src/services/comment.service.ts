import { prisma } from '../prismaClient.ts';

/*
댓글 관련 로직
*/

interface TransformedComment {
  commentId: string;
  postId: string;
  userId: string;
  parentId: string | null;
  contents: string;
  createdAt: Date;
  updatedAt: Date;
  user: { userId: string; nickname: string | null } | null;
  replies: TransformedComment[];
}

const transformComment = (comment: Record<string, unknown> | null): TransformedComment | null => {
  if (!comment) return null;
  const c = comment as Record<string, unknown> & {
    commentId: string;
    postId: string;
    userId: string;
    parentId: string | null;
    contents: string;
    createdAt: Date;
    updatedAt: Date;
    user?: { user_id: string; nickname: string | null };
    replies?: Record<string, unknown>[];
  };
  return {
    commentId: c.commentId,
    postId: c.postId,
    userId: c.userId,
    parentId: c.parentId,
    contents: c.contents,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    user: c.user
      ? {
          userId: c.user.user_id,
          nickname: c.user.nickname,
        }
      : null,
    replies: (c.replies?.map(transformComment).filter(Boolean) as TransformedComment[]) || [],
  };
};

export const createComment = async (
  postId: string,
  userId: string,
  contents: string,
  parentId: string | null = null,
): Promise<TransformedComment | null> => {
  const comment = await prisma.comment.create({
    data: {
      postId,
      userId,
      contents,
      parentId,
    },
    include: {
      user: {
        select: {
          user_id: true,
          nickname: true,
        },
      },
    },
  });

  return transformComment(comment as unknown as Record<string, unknown>);
};

export const getCommentsByPostId = async (postId: string): Promise<TransformedComment[]> => {
  const comments = await prisma.comment.findMany({
    where: {
      postId,
      parentId: null,
    },
    include: {
      user: {
        select: {
          user_id: true,
          nickname: true,
        },
      },
      replies: {
        include: {
          user: {
            select: {
              user_id: true,
              nickname: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return comments
    .map((c) => transformComment(c as unknown as Record<string, unknown>))
    .filter(Boolean) as TransformedComment[];
};

export const getCommentById = async (commentId: string): Promise<TransformedComment | null> => {
  const comment = await prisma.comment.findUnique({
    where: { commentId },
    include: {
      user: {
        select: {
          user_id: true,
          nickname: true,
        },
      },
    },
  });

  return transformComment(comment as unknown as Record<string, unknown>);
};

export const updateComment = async (
  commentId: string,
  contents: string,
): Promise<TransformedComment | null> => {
  const comment = await prisma.comment.update({
    where: { commentId },
    data: {
      contents,
      updatedAt: new Date(),
    },
    include: {
      user: {
        select: {
          user_id: true,
          nickname: true,
        },
      },
    },
  });

  return transformComment(comment as unknown as Record<string, unknown>);
};

export const deleteComment = async (commentId: string): Promise<void> => {
  await prisma.comment.delete({
    where: { commentId },
  });
};

export const getCommentCountByPostId = async (postId: string): Promise<number> => {
  const count = await prisma.comment.count({
    where: { postId },
  });
  return count;
};

export const getCommentsByUserId = async (userId: string, limit: number = 20) => {
  const comments = await prisma.comment.findMany({
    where: { userId },
    include: {
      post: {
        select: {
          post_id: true,
          contents: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });

  return comments.map((c) => ({
    ...transformComment(c as unknown as Record<string, unknown>),
    post: c.post
      ? {
          postId: c.post.post_id,
          contents: c.post.contents,
        }
      : null,
  }));
};
