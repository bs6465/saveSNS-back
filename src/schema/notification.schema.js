import { z } from 'zod';

/*
알림 관련 스키마
*/

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

// 알림 목록 조회 쿼리 스키마
export const getNotificationsSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  }),
});

// 알림 ID 파라미터 스키마
export const notificationIdSchema = z.object({
  params: z.object({
    notificationId: z.string().uuid('유효하지 않은 알림 ID입니다'),
  }),
});
