import { prisma } from '../prismaClient.js';

/* 
글 작성, 조회, 수정, 삭제 로직
*/

// POST /api/posts/ 글 작성 로직
export const createPost = async (userId, contents, longitude, latitude) => {
  const post = await prisma.post.create({
    data: {
      userId,
      contents,
      longitude,
      latitude,
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
      p.post_id AS "postId",       -- JS 스타일로 이름 변경
      p.user_id AS "userId",
      u.nickname,                  -- JOIN한 테이블에서 닉네임 가져오기
      p.contents, 
      p.created_at AS "createdAt", 
      ST_Distance(
        p.location::geography, 
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      ) as distance
    FROM "posts" p
    JOIN "users_account" u ON p.user_id = u.user_id  -- 여기서 JOIN 발생!
    WHERE ST_DWithin(
      p.location::geography,
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
      contents: true,
      createdAt: true,
      location: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  return posts;
};

// GET /api/posts/:postId 글 상세 조회 로직
export const getPostById = async (postId) => {
  const post = await prisma.post.findUnique({
    where: { postId },
    select: {
      postId: true,
      contents: true,
      createdAt: true,
      userAccount: {
        select: {
          // JOIN
          userId: true,
          nickname: true,
        },
      },
    },
  });
  if (!post) throw new Error('Post not found');
  console.log(`Post retrieved: postId:${postId}`);
  return post;
};
