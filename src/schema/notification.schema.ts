import { z } from 'zod';

/*
알림 관련 스키마
*/

export const registerPushTokenSchema = z.object({
  body: z.object({
    token: z.string({ error: '푸시 토큰은 필수입니다' }).min(1, '푸시 토큰은 필수입니다'),
    deviceType: z.enum(['ios', 'android', 'web']).optional(),
  }),
});

export const deactivatePushTokenSchema = z.object({
  body: z.object({
    token: z.string({ error: '푸시 토큰은 필수입니다' }).min(1, '푸시 토큰은 필수입니다'),
  }),
});

export const getNotificationsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const notificationIdSchema = z.object({
  notificationId: z.string().uuid('유효하지 않은 알림 ID입니다'),
});
