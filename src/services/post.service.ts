import { prisma } from '../prismaClient.ts';
import { Prisma } from '@prisma/client';
import { deleteMediaByPostId } from './media.service.ts';
import { NotFoundError, ForbiddenError } from '../errors/index.ts';
import { POST_ERRORS } from '../errors/errorCodes.ts';
import { deleteCacheByPrefix } from '../utils/cache.utils.ts';
import {
  analyzePostUrgency,
  saveUrgencyReport,
  notifyNearbyUsers,
} from './urgencyAnalyzer.service.ts';
import logger from '../config/logger.ts';

/*
글 작성, 조회, 수정, 삭제 로직
*/

interface PostListResult {
  posts: unknown[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const createPost = async (
  userId: string,
  contents: string,
  longitude: number,
  latitude: number,
  mediaUrls: string[] = [],
): Promise<{ postId: string }> => {
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
  logger.info(`Post created: postId:${post.post_id} by userId:${userId}`);

  if (mediaUrls && mediaUrls.length > 0) {
    const mediaData = mediaUrls.map((url) => ({
      post_id: post.post_id,
      link: url,
      type: 'image',
    }));

    await prisma.media_storage.createMany({
      data: mediaData,
    });
    logger.info(`Media saved: ${mediaUrls.length} files for postId:${post.post_id}`);
  }

  await deleteCacheByPrefix('posts:');

  processUrgencyAnalysis(userId, contents, longitude, latitude, post.post_id).catch((err) => {
    logger.error({ err, postId: post.post_id }, 'Urgency analysis failed');
  });

  return { postId: post.post_id };
};

const processUrgencyAnalysis = async (
  userId: string,
  contents: string,
  longitude: number,
  latitude: number,
  postId: string,
): Promise<void> => {
  const analysis = await analyzePostUrgency(contents, longitude, latitude, userId);

  if (analysis.level === 'normal') return;

  await saveUrgencyReport(postId, userId, analysis, longitude, latitude);
  await notifyNearbyUsers({ postId, contents, longitude, latitude }, analysis);
};

export const getPosts = async (
  longitude: number,
  latitude: number,
  rangeMeters: number,
  cursor: string | null = null,
  limit: number = 20,
  sortBy: string = 'recent',
): Promise<PostListResult> => {
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
    logger.info(`Posts retrieved (distance): count:${(nearbyPosts as unknown[]).length}`);
    return { posts: nearbyPosts as unknown[], nextCursor: null, hasMore: false };
  }

  const cursorCondition = cursor ? Prisma.sql`AND p.post_id < ${cursor}::uuid` : Prisma.empty;

  const nearbyPosts = await prisma.$queryRaw<Array<{ postId: string }>>`
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
              'thumbnailLink', ms.thumbnail_link,
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

  logger.info(`Posts retrieved (recent): count:${posts.length}, hasMore:${hasMore}`);
  return { posts, nextCursor, hasMore };
};

export const getAllPosts = async () => {
  const posts = await prisma.posts.findMany({
    select: {
      post_id: true,
      user_id: true,
      contents: true,
      created_at: true,
      longitude: true,
      latitude: true,
    },
    orderBy: {
      created_at: 'desc',
    },
  });
  return posts.map((p: Record<string, unknown>) => ({
    postId: p.post_id,
    userId: p.user_id,
    contents: p.contents,
    createdAt: p.created_at,
    longitude: p.longitude,
    latitude: p.latitude,
  }));
};

export const getPostById = async (postId: string) => {
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
          thumbnail_link: true,
          type: true,
          created_at: true,
        },
        orderBy: { created_at: 'asc' },
      },
    },
  });
  if (!post) throw new NotFoundError('게시글');
  logger.info(`Post retrieved: postId:${postId}`);
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
      thumbnailLink: m.thumbnail_link,
      type: m.type,
      createdAt: m.created_at,
    })),
  };
};

export const updatePost = async (postId: string, userId: string, contents: string) => {
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

  await deleteCacheByPrefix('posts:');
  logger.info(`Post updated: postId:${postId} by userId:${userId}`);
  return {
    postId: updatedPost.post_id,
    contents: updatedPost.contents,
    createdAt: updatedPost.created_at,
  };
};

export const deletePost = async (postId: string, userId: string): Promise<{ postId: string }> => {
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

  await deleteMediaByPostId(postId);

  await prisma.posts.delete({
    where: { post_id: postId },
  });

  await deleteCacheByPrefix('posts:');
  logger.info(`Post deleted: postId:${postId} by userId:${userId}`);
  return { postId };
};
