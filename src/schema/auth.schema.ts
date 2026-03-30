import { z } from 'zod';

/*
  소셜 로그인, 계정 연동 스키마
*/

export const googleLoginSchema = z.object({
  idToken: z.string().min(1, 'Google ID 토큰이 필요합니다.'),
});

export const kakaoLoginSchema = z.object({
  accessToken: z.string().min(1, '카카오 액세스 토큰이 필요합니다.'),
});

export const linkAccountSchema = z.object({
  provider: z.enum(['google', 'kakao'], {
    errorMap: () => ({ message: "provider는 'google' 또는 'kakao'여야 합니다." }),
  }),
  token: z.string().min(1, '소셜 인증 토큰이 필요합니다.'),
});

export default {
  googleLoginSchema,
  kakaoLoginSchema,
  linkAccountSchema,
};
