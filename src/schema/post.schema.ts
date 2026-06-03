import { z } from 'zod';

/*
  게시글 생성 및 조회 스키마
*/

const mediaFileSchema = z.object({
  link: z.string().url(),
  thumbnailLink: z.string().url().nullable().optional(),
  type: z.enum(['image', 'video']),
});

export const createPostSchema = z.object({
  contents: z.string().min(1, 'contents는 최소 1자 이상이어야 합니다.'),
  longitude: z.coerce.number().min(-180).max(180),
  latitude: z.coerce.number().min(-90).max(90),
  mediaUrls: z.array(z.string().url()).optional().default([]),
  mediaFiles: z.array(mediaFileSchema).max(5, '최대 5개까지 첨부할 수 있습니다.').optional().default([]),
});

export const getPostsSchema = z.object({
  longitude: z.coerce.number().min(-180).max(180),
  latitude: z.coerce.number().min(-90).max(90),
  rangeMeters: z.coerce.number().min(100).max(10000),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['recent', 'distance']).default('recent'),
});

export const getPostByIdSchema = z.object({
  postId: z.string().min(1, '유효한 postId(UUID)여야 합니다.'),
});

export const updatePostSchema = z.object({
  contents: z.string().min(1, 'contents는 최소 1자 이상이어야 합니다.'),
});
