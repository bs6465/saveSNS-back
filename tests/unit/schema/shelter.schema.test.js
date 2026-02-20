import { describe, it, expect } from 'vitest';
import {
  nearbySheltersQuery,
  sheltersByRegionQuery,
  offlineDownloadQuery,
} from '../../../src/schema/shelter.schema.js';

describe('shelter.schema', () => {
  describe('nearbySheltersQuery', () => {
    it('유효한 쿼리를 파싱한다', () => {
      const result = nearbySheltersQuery.safeParse({
        longitude: '127.0',
        latitude: '37.5',
      });
      expect(result.success).toBe(true);
      expect(result.data.radiusMeters).toBe(5000);
      expect(result.data.limit).toBe(50);
    });

    it('shelterType 필터를 허용한다', () => {
      const result = nearbySheltersQuery.safeParse({
        longitude: '127.0',
        latitude: '37.5',
        shelterType: 'earthquake',
      });
      expect(result.success).toBe(true);
      expect(result.data.shelterType).toBe('earthquake');
    });

    it('잘못된 shelterType은 거부한다', () => {
      const result = nearbySheltersQuery.safeParse({
        longitude: '127.0',
        latitude: '37.5',
        shelterType: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('필수 필드 누락 시 실패한다', () => {
      const result = nearbySheltersQuery.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('sheltersByRegionQuery', () => {
    it('sidoName만으로 조회 가능하다', () => {
      const result = sheltersByRegionQuery.safeParse({ sidoName: '서울특별시' });
      expect(result.success).toBe(true);
    });

    it('sidoName이 비어있으면 실패한다', () => {
      const result = sheltersByRegionQuery.safeParse({ sidoName: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('offlineDownloadQuery', () => {
    it('시도명으로 오프라인 데이터 요청 가능하다', () => {
      const result = offlineDownloadQuery.safeParse({ sidoName: '경기도' });
      expect(result.success).toBe(true);
    });

    it('shelterType 필터 가능하다', () => {
      const result = offlineDownloadQuery.safeParse({
        sidoName: '경기도',
        shelterType: 'flood',
      });
      expect(result.success).toBe(true);
    });
  });
});
