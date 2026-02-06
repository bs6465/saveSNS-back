import { z } from 'zod';

// 푸시 토큰 등록 스키마
export const registerPushTokenSchema = z.object({
  body: z.object({
    token: z
      .string({ required_error: '푸시 토큰은 필수입니다' })
      .min(1, '푸시 토큰은 필수입니다'),
    deviceType: z.enum(['ios', 'android', 'web']).optional(),
  }),
});

// 푸시 토큰 해제 스키마
export const deactivatePushTokenSchema = z.object({
  body: z.object({
    token: z
      .string({ required_error: '푸시 토큰은 필수입니다' })
      .min(1, '푸시 토큰은 필수입니다'),
  }),
});
