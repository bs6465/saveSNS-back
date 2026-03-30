import { prisma } from '../prismaClient.ts';
import { Prisma } from '@prisma/client';
import logger from '../config/logger.ts';

/*
게시글/사용자 검색 로직
pg_trgm 확장의 ILIKE + GIN 인덱스를 활용한 한국어 검색 지원
*/

interface SearchPostsOptions {
  longitude?: number | null;
  latitude?: number | null;
  rangeMeters?: number | null;
  cursor?: string | null;
  limit?: number;
}

interface PostResult {
  postId: string;
  [key: string]: unknown;
}

interface UserResult {
  userId: string;
  nickname: string | null;
}

export const searchPosts = async (query: string, options: SearchPostsOptions = {}) => {
  const { longitude, latitude, rangeMeters, cursor, limit = 20 } = options;

  const cursorCondition = cursor ? Prisma.sql`AND p.post_id < ${cursor}::uuid` : Prisma.empty;

  const hasSpatialFilter = longitude != null && latitude != null && rangeMeters != null;

  const spatialCondition = hasSpatialFilter
    ? Prisma.sql`AND ST_DWithin(
        p.location::geography,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
        ${rangeMeters}
      )`
    : Prisma.empty;

  const distanceColumn =
    longitude != null && latitude != null
      ? Prisma.sql`ST_Distance(
        p.location::geography,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      )`
      : Prisma.sql`NULL`;

  const searchPattern = `%${query}%`;

  const results = await prisma.$queryRaw<PostResult[]>`
    SELECT
      p.post_id AS "postId",
      p.user_id AS "userId",
      u.nickname,
      p.contents,
      p.created_at AS "createdAt",
      ${distanceColumn} as distance,
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
    WHERE p.contents ILIKE ${searchPattern}
    ${spatialCondition}
    ${cursorCondition}
    ORDER BY p.post_id DESC
    LIMIT ${limit + 1}
  `;

  const hasMore = results.length > limit;
  const posts = hasMore ? results.slice(0, limit) : results;
  const nextCursor = hasMore ? posts[posts.length - 1].postId : null;

  logger.info(`Search posts: query="${query}", count:${posts.length}, hasMore:${hasMore}`);
  return { posts, nextCursor, hasMore };
};

export const searchUsers = async (
  query: string,
  cursor: string | null = null,
  limit: number = 20,
) => {
  const searchPattern = `%${query}%`;

  const cursorCondition = cursor ? Prisma.sql`AND u.user_id < ${cursor}::uuid` : Prisma.empty;

  const results = await prisma.$queryRaw<UserResult[]>`
    SELECT
      u.user_id AS "userId",
      u.nickname
    FROM "users_account" u
    WHERE u.nickname ILIKE ${searchPattern}
    ${cursorCondition}
    ORDER BY u.user_id DESC
    LIMIT ${limit + 1}
  `;

  const hasMore = results.length > limit;
  const users = hasMore ? results.slice(0, limit) : results;
  const nextCursor = hasMore ? users[users.length - 1].userId : null;

  logger.info(`Search users: query="${query}", count:${users.length}, hasMore:${hasMore}`);
  return { users, nextCursor, hasMore };
};
