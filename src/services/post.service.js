import { prisma } from '../prismaClient.js';
import { deleteMediaByPostId } from './media.service.js';
import { NotFoundError, ForbiddenError } from '../errors/index.js';
import { POST_ERRORS } from '../errors/errorCodes.js';

/*
글 작성, 조회, 수정, 삭제 로직
*/

// POST /api/posts/ 글 작성 로직
export const createPost = async (userId, contents, longitude, latitude, mediaUrls = []) => {
  const post = await prisma.posts.create({
    data: {
      user_id: userId,
      contents,
      longitude,
      latitude,
    },
    select: {
      post_id: true,
    },
  });
  console.log(`Post created: postId:${post.post_id} by userId:${userId}`);

  // 미디어 URL이 있으면 MediaStorage에 저장
  if (mediaUrls && mediaUrls.length > 0) {
    const mediaData = mediaUrls.map((url) => ({
      post_id: post.post_id,
      link: url,
      type: 'image', // 현재는 이미지만 지원
    }));

    await prisma.media_storage.createMany({
      data: mediaData,
    });
    console.log(`Media saved: ${mediaUrls.length} files for postId:${post.post_id}`);
  }

  return { postId: post.post_id };
};

// GET /api/posts/ 글 목록 조회 로직
// 최적화: N+1 쿼리 문제 해결 - 단일 쿼리로 모든 데이터 조회
export const getPosts = async (longitude, latitude, rangeMeters) => {
  // 내 위치 기준 반경 n km 내 글 찾기
  // 단일 쿼리로 게시글, 미디어, 좋아요 수, 댓글 수를 모두 조회
  const nearbyPosts = await prisma.$queryRaw`
    SELECT
      p.post_id AS "postId",
      p.user_id AS "userId",
      u.nickname,
      p.contents,
      p.created_at AS "createdAt",
      ST_Distance(
        p.location::geography,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      ) as distance,
      -- 좋아요 수 서브쿼리
      (SELECT COUNT(*)::int FROM "post_like" pl WHERE pl."postId" = p.post_id) AS "likeCount",
      -- 댓글 수 서브쿼리
      (SELECT COUNT(*)::int FROM "comment" c WHERE c."postId" = p.post_id) AS "commentCount",
      -- 미디어 배열 집계
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'mediaId', ms.media_id,
              'link', ms.link,
              'type', ms.type
            ) ORDER BY ms.created_at ASC
          )
          FROM "media_storage" ms
          WHERE ms.post_id = p.post_id
        ),
        '[]'::json
      ) AS media
    FROM "posts" p
    JOIN "users_account" u ON p.user_id = u.user_id
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
  const posts = await prisma.posts.findMany({
    select: {
      post_id: true,
      user_id: true,
      contents: true,
      created_at: true,
      location: true,
    },
    orderBy: {
      created_at: 'desc',
    },
  });
  return posts.map((p) => ({
    postId: p.post_id,
    userId: p.user_id,
    contents: p.contents,
    createdAt: p.created_at,
    location: p.location,
  }));
};

// GET /api/posts/:postId 글 상세 조회 로직
export const getPostById = async (postId) => {
  const post = await prisma.posts.findUnique({
    where: { post_id: postId },
    select: {
      post_id: true,
      contents: true,
      created_at: true,
      longitude: true,
      latitude: true,
      users_account: {
        select: {
          user_id: true,
          nickname: true,
        },
      },
      media_storage: {
        select: {
          media_id: true,
          link: true,
          type: true,
          created_at: true,
        },
        orderBy: { created_at: 'asc' },
      },
    },
  });
  if (!post) throw new NotFoundError('게시글');
  console.log(`Post retrieved: postId:${postId}`);
  return {
    postId: post.post_id,
    contents: post.contents,
    createdAt: post.created_at,
    longitude: post.longitude,
    latitude: post.latitude,
    user: {
      userId: post.users_account.user_id,
      nickname: post.users_account.nickname,
    },
    media: post.media_storage.map((m) => ({
      mediaId: m.media_id,
      link: m.link,
      type: m.type,
      createdAt: m.created_at,
    })),
  };
};

// PUT /api/posts/:postId 글 수정 로직
export const updatePost = async (postId, userId, contents) => {
  // 게시글 존재 및 소유권 확인
  const existingPost = await prisma.posts.findUnique({
    where: { post_id: postId },
    select: { user_id: true },
  });

  if (!existingPost) {
    throw new NotFoundError('게시글');
  }

  if (existingPost.user_id !== userId) {
    throw new ForbiddenError(POST_ERRORS.NOT_POST_OWNER.message);
  }

  const updatedPost = await prisma.posts.update({
    where: { post_id: postId },
    data: { contents },
    select: {
      post_id: true,
      contents: true,
      created_at: true,
    },
  });

  console.log(`Post updated: postId:${postId} by userId:${userId}`);
  return {
    postId: updatedPost.post_id,
    contents: updatedPost.contents,
    createdAt: updatedPost.created_at,
  };
};

// DELETE /api/posts/:postId 글 삭제 로직
export const deletePost = async (postId, userId) => {
  // 게시글 존재 및 소유권 확인
  const existingPost = await prisma.posts.findUnique({
    where: { post_id: postId },
    select: { user_id: true },
  });

  if (!existingPost) {
    throw new NotFoundError('게시글');
  }

  if (existingPost.user_id !== userId) {
    throw new ForbiddenError(POST_ERRORS.NOT_POST_OWNER.message);
  }

  // S3에서 미디어 파일 삭제 (DB cascade 삭제 전에 실행)
  await deleteMediaByPostId(postId);

  await prisma.posts.delete({
    where: { post_id: postId },
  });

  console.log(`Post deleted: postId:${postId} by userId:${userId}`);
  return { postId };
};
