import { prisma } from '../prismaClient.js';
import { Prisma } from '@prisma/client';
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
// 커서 기반 페이지네이션 + 정렬 모드(최신순/거리순) 지원
export const getPosts = async (longitude, latitude, rangeMeters, cursor = null, limit = 20, sortBy = 'recent') => {
  // 거리순: 페이지네이션 없이 최대 100개 반환
  if (sortBy === 'distance') {
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
        (SELECT COUNT(*)::int FROM "post_like" pl WHERE pl."postId" = p.post_id) AS "likeCount",
        (SELECT COUNT(*)::int FROM "comment" c WHERE c."postId" = p.post_id) AS "commentCount",
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
      LIMIT 100
    `;
    console.log(`Posts retrieved (distance): count:${nearbyPosts.length}`);
    return { posts: nearbyPosts, nextCursor: null, hasMore: false };
  }

  // 최신순: 커서 기반 페이지네이션
  const cursorCondition = cursor
    ? Prisma.sql`AND p.post_id < ${cursor}::uuid`
    : Prisma.empty;

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
      (SELECT COUNT(*)::int FROM "post_like" pl WHERE pl."postId" = p.post_id) AS "likeCount",
      (SELECT COUNT(*)::int FROM "comment" c WHERE c."postId" = p.post_id) AS "commentCount",
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
    ${cursorCondition}
    ORDER BY p.post_id DESC
    LIMIT ${limit + 1}
  `;

  const hasMore = nearbyPosts.length > limit;
  const posts = hasMore ? nearbyPosts.slice(0, limit) : nearbyPosts;
  const nextCursor = hasMore ? posts[posts.length - 1].postId : null;

  console.log(`Posts retrieved (recent): count:${posts.length}, hasMore:${hasMore}`);
  return { posts, nextCursor, hasMore };
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
