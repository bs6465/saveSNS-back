import { z } from 'zod';

/*
  게시글 생성 및 조회 스키마
*/

// 게시글 생성 스키마, vaidateBody 미들웨어에서 사용
export const createPostSchema = z.object({
  contents: z.string().min(1, 'contents는 최소 1자 이상이어야 합니다.'),
  longitude: z.coerce
    .number()
    .min(-180)
    .max(180)
    .describe('경도 값은 -180에서 180 사이여야 합니다.'),
  latitude: z.coerce.number().min(-90).max(90).describe('위도 값은 -90에서 90 사이여야 합니다.'),
});

// 게시글 조회 스키마, validateBody 미들웨어에서 사용
export const getPostsSchema = z.object({
  longitude: z.coerce
    .number()
    .min(-180)
    .max(180)
    .describe('경도 값은 -180에서 180 사이여야 합니다.'),
  latitude: z.coerce.number().min(-90).max(90).describe('위도 값은 -90에서 90 사이여야 합니다.'),
  rangeMeters: z.coerce
    .number()
    .min(100)
    .max(10000)
    .describe('범위는 100에서 10000 미터 사이여야 합니다.'),
});
