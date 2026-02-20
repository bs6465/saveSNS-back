import { z } from 'zod';

export const searchPostsSchema = z.object({
  q: z.string().min(1, '검색어는 최소 1자 이상이어야 합니다.').max(100),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  rangeMeters: z.coerce.number().min(100).max(50000).optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const searchUsersSchema = z.object({
  q: z.string().min(1, '검색어는 최소 1자 이상이어야 합니다.').max(50),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});
