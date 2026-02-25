import { describe, it, expect, beforeEach, vi } from 'vitest';

// Redis mock – 간단한 인메모리 Map 기반
const store = new Map();
const redisMock = {
  get: vi.fn(async (key) => store.get(key) ?? null),
  set: vi.fn(async (key, value, ...args) => {
    store.set(key, value);
    return 'OK';
  }),
  del: vi.fn(async (...keys) => {
    let count = 0;
    for (const k of keys) {
      if (store.delete(k)) count++;
    }
    return count;
  }),
  scan: vi.fn(async (cursor, _matchKey, pattern, _countKey, _count) => {
    const prefix = pattern.replace('*', '');
    const matched = [...store.keys()].filter((k) => k.startsWith(prefix));
    return ['0', matched]; // 한 번에 모두 반환
  }),
};

// redis 모듈을 mock
vi.mock('../../../src/config/redis.ts', () => ({ redis: redisMock }));
vi.mock('../../../src/config/logger.ts', () => ({
  default: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

let cacheModule;

beforeEach(async () => {
  store.clear();
  vi.clearAllMocks();
  vi.resetModules();
  cacheModule = await import('../../../src/utils/cache.utils.ts');
});

describe('cache.utils (Redis)', () => {
  describe('getCache / setCache', () => {
    it('캐시에 값을 설정하고 조회할 수 있다', async () => {
      await cacheModule.setCache('test-key', { data: 'hello' });
      const result = await cacheModule.getCache('test-key');
      expect(result).toEqual({ data: 'hello' });
    });

    it('존재하지 않는 키는 undefined를 반환한다', async () => {
      const result = await cacheModule.getCache('nonexistent');
      expect(result).toBeUndefined();
    });

    it('커스텀 TTL을 설정할 수 있다', async () => {
      await cacheModule.setCache('ttl-key', 'value', 60);
      expect(redisMock.set).toHaveBeenCalledWith('ttl-key', '"value"', 'EX', 60);
      const result = await cacheModule.getCache('ttl-key');
      expect(result).toBe('value');
    });

    it('TTL 없이 호출 시 EX 옵션 없이 저장한다', async () => {
      await cacheModule.setCache('no-ttl', 'abc');
      expect(redisMock.set).toHaveBeenCalledWith('no-ttl', '"abc"');
    });
  });

  describe('deleteCache', () => {
    it('캐시 키를 삭제할 수 있다', async () => {
      await cacheModule.setCache('del-key', 'value');
      await cacheModule.deleteCache('del-key');
      const result = await cacheModule.getCache('del-key');
      expect(result).toBeUndefined();
    });
  });

  describe('deleteCacheByPrefix', () => {
    it('특정 접두사의 캐시를 모두 삭제한다', async () => {
      await cacheModule.setCache('posts:1', 'a');
      await cacheModule.setCache('posts:2', 'b');
      await cacheModule.setCache('weather:1', 'c');

      await cacheModule.deleteCacheByPrefix('posts:');

      expect(await cacheModule.getCache('posts:1')).toBeUndefined();
      expect(await cacheModule.getCache('posts:2')).toBeUndefined();
      expect(await cacheModule.getCache('weather:1')).toBe('c');
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

  describe('에러 처리 (graceful degradation)', () => {
    it('getCache Redis 오류 시 undefined 반환', async () => {
      redisMock.get.mockRejectedValueOnce(new Error('connection lost'));
      const result = await cacheModule.getCache('any-key');
      expect(result).toBeUndefined();
    });

    it('setCache Redis 오류 시 false 반환', async () => {
      redisMock.set.mockRejectedValueOnce(new Error('connection lost'));
      const result = await cacheModule.setCache('any-key', 'val');
      expect(result).toBe(false);
    });

    it('deleteCache Redis 오류 시 0 반환', async () => {
      redisMock.del.mockRejectedValueOnce(new Error('connection lost'));
      const result = await cacheModule.deleteCache('any-key');
      expect(result).toBe(0);
    });
  });
});
