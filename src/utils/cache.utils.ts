import NodeCache from 'node-cache';

export const CACHE_TTL = {
  weather: 600,
  airQuality: 600,
  profile: 300,
  posts: 60,
  search: 120,
} as const;

const cache = new NodeCache({
  stdTTL: 60,
  checkperiod: 120,
  useClones: false,
  maxKeys: 1000,
});

export const getCache = <T>(key: string): T | undefined => cache.get<T>(key);

export const setCache = <T>(key: string, value: T, ttl?: number): boolean =>
  cache.set(key, value, ttl ?? 0);

export const deleteCache = (key: string): number => cache.del(key);

export const deleteCacheByPrefix = (prefix: string): void => {
  const keys = cache.keys().filter((k) => k.startsWith(prefix));
  if (keys.length > 0) cache.del(keys);
};

export const cacheKeys = {
  weather: (userId: string) => `weather:${userId}`,
  airQuality: (sidoName: string) => `airquality:${sidoName}`,
  profile: (userId: string) => `profile:${userId}`,
  posts: (lon: number, lat: number, range: number, cursor: string | null, sortBy: string) =>
    `posts:${lon}:${lat}:${range}:${sortBy}:${cursor || 'first'}`,
  searchPosts: (query: string, cursor?: string) => `search:posts:${query}:${cursor || 'first'}`,
};

export default cache;
