import { z } from 'zod';

/*
  회원가입, 로그인, 토큰 검증 스키마
*/

// 회원가입 스키마, validateBody 미들웨어에서 사용
export const registerSchema = z.object({
  username: z.string().min(3, 'username은 최소 3자 이상이어야 합니다.'),
  password: z.string().min(3, 'password는 최소 3자 이상이어야 합니다.'),
  longitude: z.number().optional(),
  latitude: z.number().optional(),
});

// 로그인 스키마, validateBody 미들웨어에서 사용
export const loginSchema = z.object({
  username: z.string().min(3, 'username은 최소 3자 이상이어야 합니다.'),
  password: z.string().min(3, 'password는 최소 3자 이상이어야 합니다.'),
});

// 로그인 확인 스키마, validateToken 미들웨어에서 사용
export const checkAuth = z.object({
  userId: z.string().min(1, '유효한 userId여야 합니다.'),
});
