import { prisma } from '../prismaClient.js';
import jwttoken from '../utils/jwttoken.utils.js';

/* 
글 작성, 조회, 수정, 삭제 로직
*/

// POST /api/posts/ 글 작성 로직
export const createPost = async (userId, content, location) => {
  const post = await prisma.post.create({
    data: {
      userId,
      content,
      location,
    },
    select: {
      postId: true,
    },
  });
  console.log(`Post created: postId:${post.postId} by userId:${userId}`);

  return post;
};

// GET /api/posts/ 글 목록 조회 로직
export const getPosts = async (longitude, latitude, rangeMeters) => {
  // 내 위치 기준 반경 n km 내 글 찾기
  // Prisma Raw Query 사용
  const nearbyPosts = await prisma.$queryRaw`
    SELECT 
      post_id, 
      user_id,
      content, 
      created_at, 
      ST_Distance(
        location::geography, 
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      ) as distance
    FROM "posts"
    WHERE ST_DWithin(
      location::geography,
      ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
      ${rangeMeters}
    )
    ORDER BY distance ASC
  `;
  console.log(`Posts retrieved: count:${nearbyPosts.length}`);

  return nearbyPosts;
};

// GET /api/posts/ 글 전체 조회 로직
export const getAllPosts = async () => {
  const posts = await prisma.post.findMany({
    select: {
      postId: true,
      userId: true,
      content: true,
      createdAt: true,
      location: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  return posts;
};

// 추가적인 글 수정, 삭제 로직도 여기에 작성 가능
