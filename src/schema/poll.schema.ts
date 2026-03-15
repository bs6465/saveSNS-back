import { z } from 'zod';

export const createPollSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(200, '제목은 200자 이하로 작성해주세요'),
  description: z.string().max(1000).optional().nullable(),
  options: z
    .array(z.string().min(1, '선택지를 입력해주세요').max(100))
    .min(2, '최소 2개의 선택지가 필요합니다')
    .max(10, '최대 10개의 선택지까지 가능합니다'),
  longitude: z.number().optional().nullable(),
  latitude: z.number().optional().nullable(),
  durationHours: z.number().min(1).max(168).default(24), // 1시간 ~ 7일
});

export const votePollSchema = z.object({
  optionId: z.string().uuid('유효하지 않은 선택지 ID입니다'),
});
