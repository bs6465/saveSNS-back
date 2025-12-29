import { z } from 'zod';

/*
  프로필 조회 및 수정 스키마
*/

// 프로필 수정 스키마, validateBody 미들웨어에서 사용
export const setLocationSchema = z.object({
  longitude: z.coerce.number().min(-180).max(180).describe('경도 값은 -180에서 180 사이여야 합니다.'),
  latitude: z.coerce.number().min(-90).max(90).describe('위도 값은 -90에서 90 사이여야 합니다.'),
});