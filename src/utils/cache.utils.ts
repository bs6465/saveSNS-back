import { redis } from '../config/redis.ts';
import logger from '../config/logger.ts';

export const CACHE_TTL = {
  weather: 600,
  airQuality: 600,
  profile: 300,
  posts: 60,
  search: 120,
} as const;

/**
 * Redis에서 캐시 값을 조회한다.
 * JSON으로 직렬화된 값을 파싱하여 반환.
 */
export const getCache = async <T>(key: string): Promise<T | undefined> => {
  try {
    const data = await redis.get(key);
    if (data === null) return undefined;
    return JSON.parse(data) as T;
  } catch (err) {
    logger.warn({ err, key }, 'Redis getCache failed, treating as cache miss');
    return undefined;
  }
};

/**
 * Redis에 캐시 값을 저장한다.
 * ttl(초) 지정 시 EX 옵션으로 만료 시간 설정.
 */
export const setCache = async <T>(key: string, value: T, ttl?: number): Promise<boolean> => {
  try {
    const serialized = JSON.stringify(value);
    if (ttl && ttl > 0) {
      await redis.set(key, serialized, 'EX', ttl);
    } else {
      await redis.set(key, serialized);
    }
    return true;
  } catch (err) {
    logger.warn({ err, key }, 'Redis setCache failed');
    return false;
  }
};

/**
 * Redis에서 캐시 키를 삭제한다.
 */
export const deleteCache = async (key: string): Promise<number> => {
  try {
    return await redis.del(key);
  } catch (err) {
    logger.warn({ err, key }, 'Redis deleteCache failed');
    return 0;
  }
};

/**
 * Redis에서 특정 접두사로 시작하는 캐시를 모두 삭제한다.
 * SCAN 명령으로 키를 찾아 일괄 삭제 (KEYS 명령 대신 프로덕션 안전).
 */
export const deleteCacheByPrefix = async (prefix: string): Promise<void> => {
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    logger.warn({ err, prefix }, 'Redis deleteCacheByPrefix failed');
  }
};

export const cacheKeys = {
  weather: (userId: string) => `weather:${userId}`,
  airQuality: (sidoName: string) => `airquality:${sidoName}`,
  profile: (userId: string) => `profile:${userId}`,
  posts: (lon: number, lat: number, range: number, cursor: string | null, sortBy: string) =>
    `posts:${lon}:${lat}:${range}:${sortBy}:${cursor || 'first'}`,
  searchPosts: (query: string, cursor?: string) => `search:posts:${query}:${cursor || 'first'}`,
};
