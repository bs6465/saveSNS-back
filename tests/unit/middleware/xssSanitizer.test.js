import { describe, it, expect, vi } from 'vitest';
import { xssSanitizer } from '../../../src/middleware/xssSanitizer.js';

describe('xssSanitizer (express-xss-sanitizer)', () => {
  describe('xssSanitizer middleware', () => {
    it('script 태그가 포함된 body를 정리한다', () => {
      const middleware = xssSanitizer();
      const req = {
        body: { contents: '<script>xss</script>안녕' },
        query: {},
        params: {},
        headers: {},
      };
      const res = {};
      const next = vi.fn();

      middleware(req, res, next);

      expect(req.body.contents).not.toContain('<script>');
      expect(req.body.contents).toContain('안녕');
      expect(next).toHaveBeenCalled();
    });

    it('password 필드를 건너뛴다', () => {
      const middleware = xssSanitizer();
      const req = {
        body: { password: 'P@ss<>123' },
        query: {},
        params: {},
        headers: {},
      };
      const next = vi.fn();

      middleware(req, res, next);
      // allowedKeys에 의해 password는 sanitize 되지 않음
      expect(req.body.password).toBe('P@ss<>123');
    });

    it('일반 텍스트는 변경하지 않는다', () => {
      const middleware = xssSanitizer();
      const req = {
        body: { contents: '안녕하세요 일반 텍스트입니다' },
        query: { search: '검색어' },
        params: { id: 'abc-123' },
        headers: {},
      };
      const next = vi.fn();

      middleware(req, res, next);

      expect(req.body.contents).toBe('안녕하세요 일반 텍스트입니다');
      expect(req.query.search).toBe('검색어');
      expect(req.params.id).toBe('abc-123');
    });
  });
});

const res = {
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
};
