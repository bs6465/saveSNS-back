import { describe, it, expect } from 'vitest';
import {
  getUrgencyReportsQuery,
  submitFeedbackBody,
  urgencyReportIdParam,
} from '../../../src/schema/urgency.schema.js';

describe('urgency.schema', () => {
  describe('getUrgencyReportsQuery', () => {
    it('유효한 쿼리를 파싱한다', () => {
      const result = getUrgencyReportsQuery.safeParse({
        longitude: '127.0',
        latitude: '37.5',
        radiusMeters: '3000',
        limit: '10',
      });
      expect(result.success).toBe(true);
      expect(result.data.longitude).toBe(127.0);
      expect(result.data.radiusMeters).toBe(3000);
    });

    it('기본값이 적용된다', () => {
      const result = getUrgencyReportsQuery.safeParse({
        longitude: '127.0',
        latitude: '37.5',
      });
      expect(result.success).toBe(true);
      expect(result.data.radiusMeters).toBe(5000);
      expect(result.data.limit).toBe(20);
    });

    it('longitude 범위를 벗어나면 실패한다', () => {
      const result = getUrgencyReportsQuery.safeParse({
        longitude: '200',
        latitude: '37.5',
      });
      expect(result.success).toBe(false);
    });

    it('필수 필드 누락 시 실패한다', () => {
      const result = getUrgencyReportsQuery.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('submitFeedbackBody', () => {
    it('confirm 액션을 허용한다', () => {
      const result = submitFeedbackBody.safeParse({ action: 'confirm' });
      expect(result.success).toBe(true);
    });

    it('report 액션을 허용한다', () => {
      const result = submitFeedbackBody.safeParse({ action: 'report' });
      expect(result.success).toBe(true);
    });

    it('잘못된 액션은 거부한다', () => {
      const result = submitFeedbackBody.safeParse({ action: 'delete' });
      expect(result.success).toBe(false);
    });
  });

  describe('urgencyReportIdParam', () => {
    it('유효한 UUID를 허용한다', () => {
      const result = urgencyReportIdParam.safeParse({
        reportId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('잘못된 UUID는 거부한다', () => {
      const result = urgencyReportIdParam.safeParse({ reportId: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });
  });
});
