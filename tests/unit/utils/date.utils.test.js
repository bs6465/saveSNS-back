import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getKstDate } from '../../../src/utils/date.utils.js';

describe('date.utils', () => {
  describe('getKstDate', () => {
    it('Date 객체를 반환한다', () => {
      const result = getKstDate();
      expect(result).toBeInstanceOf(Date);
    });

    it('UTC보다 9시간 진행된 날짜를 반환한다', () => {
      // 고정 시간으로 테스트
      const fixedDate = new Date('2026-02-20T00:00:00Z');
      vi.setSystemTime(fixedDate);

      const kst = getKstDate();
      // UTC 00:00 + 9h = 09:00 KST
      expect(kst.getUTCHours()).toBe(9);

      vi.useRealTimers();
    });

    it('자정 근처에서도 올바르게 동작한다', () => {
      // UTC 20:00 → KST 다음날 05:00
      const fixedDate = new Date('2026-02-20T20:00:00Z');
      vi.setSystemTime(fixedDate);

      const kst = getKstDate();
      expect(kst.getUTCHours()).toBe(5);
      expect(kst.getUTCDate()).toBe(21);

      vi.useRealTimers();
    });
  });
});
