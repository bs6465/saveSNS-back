import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import NodeCache from 'node-cache';

// 모듈을 동적으로 import하여 각 테스트에서 독립적인 캐시 인스턴스 사용
let cacheModule;

beforeEach(async () => {
  // 모듈 캐시 초기화 후 fresh import
  vi.resetModules();
  cacheModule = await import('../../../src/utils/cache.utils.js');
});

describe('cache.utils', () => {
  describe('getCache / setCache', () => {
    it('캐시에 값을 설정하고 조회할 수 있다', () => {
      cacheModule.setCache('test-key', { data: 'hello' });
      const result = cacheModule.getCache('test-key');
      expect(result).toEqual({ data: 'hello' });
    });

    it('존재하지 않는 키는 undefined를 반환한다', () => {
      const result = cacheModule.getCache('nonexistent');
      expect(result).toBeUndefined();
    });

    it('커스텀 TTL을 설정할 수 있다', () => {
      cacheModule.setCache('ttl-key', 'value', 1);
      const result = cacheModule.getCache('ttl-key');
      expect(result).toBe('value');
    });
  });

  describe('deleteCache', () => {
    it('캐시 키를 삭제할 수 있다', () => {
      cacheModule.setCache('del-key', 'value');
      cacheModule.deleteCache('del-key');
      const result = cacheModule.getCache('del-key');
      expect(result).toBeUndefined();
    });
  });

  describe('deleteCacheByPrefix', () => {
    it('특정 접두사의 캐시를 모두 삭제한다', () => {
      cacheModule.setCache('posts:1', 'a');
      cacheModule.setCache('posts:2', 'b');
      cacheModule.setCache('weather:1', 'c');

      cacheModule.deleteCacheByPrefix('posts:');

      expect(cacheModule.getCache('posts:1')).toBeUndefined();
      expect(cacheModule.getCache('posts:2')).toBeUndefined();
      expect(cacheModule.getCache('weather:1')).toBe('c');
    });
  });

  describe('cacheKeys', () => {
    it('weather 키를 올바르게 생성한다', () => {
      expect(cacheModule.cacheKeys.weather('user-123')).toBe('weather:user-123');
    });

    it('airQuality 키를 올바르게 생성한다', () => {
      expect(cacheModule.cacheKeys.airQuality('서울')).toBe('airquality:서울');
    });

    it('profile 키를 올바르게 생성한다', () => {
      expect(cacheModule.cacheKeys.profile('user-456')).toBe('profile:user-456');
    });

    it('posts 키를 cursor 없이 생성한다', () => {
      const key = cacheModule.cacheKeys.posts(127.0, 37.5, 5000, null, 'recent');
      expect(key).toBe('posts:127:37.5:5000:recent:first');
    });

    it('posts 키를 cursor 포함하여 생성한다', () => {
      const key = cacheModule.cacheKeys.posts(127.0, 37.5, 5000, 'abc', 'recent');
      expect(key).toBe('posts:127:37.5:5000:recent:abc');
    });

    it('searchPosts 키를 올바르게 생성한다', () => {
      expect(cacheModule.cacheKeys.searchPosts('테스트', null)).toBe('search:posts:테스트:first');
    });
  });

  describe('CACHE_TTL', () => {
    it('올바른 TTL 값을 가진다', () => {
      expect(cacheModule.CACHE_TTL.weather).toBe(600);
      expect(cacheModule.CACHE_TTL.airQuality).toBe(600);
      expect(cacheModule.CACHE_TTL.profile).toBe(300);
      expect(cacheModule.CACHE_TTL.posts).toBe(60);
      expect(cacheModule.CACHE_TTL.search).toBe(120);
    });
  });
});
