import { prisma } from '../prismaClient.js';

/*
댓글 관련 로직
*/

// 댓글 작성
export const createComment = async (postId, userId, contents, parentId = null) => {
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
          userId: true,
          username: true,
          nickname: true,
        },
      },
    },
  });

  return comment;
};

// 게시글의 댓글 목록 조회
export const getCommentsByPostId = async (postId) => {
  const comments = await prisma.comment.findMany({
    where: {
      postId,
      parentId: null, // 최상위 댓글만 조회
    },
    include: {
      user: {
        select: {
          userId: true,
          username: true,
          nickname: true,
        },
      },
      replies: {
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
          createdAt: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return comments;
};

// 댓글 단건 조회
export const getCommentById = async (commentId) => {
  const comment = await prisma.comment.findUnique({
    where: { commentId },
    include: {
      user: {
        select: {
          userId: true,
          username: true,
          nickname: true,
        },
      },
    },
  });

  return comment;
};

// 댓글 수정
export const updateComment = async (commentId, contents) => {
  const comment = await prisma.comment.update({
    where: { commentId },
    data: {
      contents,
      updatedAt: new Date(),
    },
    include: {
      user: {
        select: {
          userId: true,
          username: true,
          nickname: true,
        },
      },
    },
  });

  return comment;
};

// 댓글 삭제
export const deleteComment = async (commentId) => {
  await prisma.comment.delete({
    where: { commentId },
  });
};

// 게시글의 댓글 수 조회
export const getCommentCountByPostId = async (postId) => {
  const count = await prisma.comment.count({
    where: { postId },
  });

  return count;
};

// 사용자의 댓글 목록 조회
export const getCommentsByUserId = async (userId, limit = 20) => {
  const comments = await prisma.comment.findMany({
    where: { userId },
    include: {
      post: {
        select: {
          postId: true,
          contents: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });

  return comments;
};
