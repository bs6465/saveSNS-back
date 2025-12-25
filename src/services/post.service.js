import { prisma } from '../prismaClient.js';
import jwttoken from '../utils/jwttoken.utils.js';

/* 
글 작성, 조회, 수정, 삭제 로직
*/

// POST /api/posts/ 글 작성 로직
export const createPost = async (userId, title, content) => {
  const post = await prisma.post.create({
    data: {
      userId,
      title,
      content,
    },
  });
  return post;
};

// GET /api/posts/ 글 목록 조회 로직
export const getPosts = async () => {
  const posts = await prisma.post.findMany({
    select: {
      postId: true,
      title: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  return posts;
};

export const getAllPosts = async () => {
  const posts = await prisma.post.findMany({
    select: {
      postId: true,
      title: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  return posts;
};

// 추가적인 글 수정, 삭제 로직도 여기에 작성 가능
