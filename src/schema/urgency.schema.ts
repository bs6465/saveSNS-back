import { z } from 'zod';

export const getUrgencyReportsQuery = z.object({
  longitude: z.coerce.number().min(-180).max(180),
  latitude: z.coerce.number().min(-90).max(90),
  radiusMeters: z.coerce.number().int().min(100).max(50000).default(5000),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const submitFeedbackBody = z.object({
  action: z.enum(['confirm', 'report']),
});

export const urgencyReportIdParam = z.object({
  reportId: z.string().uuid(),
});
