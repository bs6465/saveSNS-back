import Redis from 'ioredis';
import logger from './logger.ts';

const REDIS_URL = process.env.REDIS_URL; // e.g. redis://:password@host:6379
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

function createRedisClient(): Redis {
  const client = REDIS_URL
    ? new Redis(REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: true })
    : new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        retryStrategy(times: number) {
          if (times > 10) {
            logger.error('Redis: max retry attempts reached, giving up');
            return null; // stop retrying
          }
          return Math.min(times * 200, 3000); // exponential backoff, max 3s
        },
      });

  client.on('connect', () => {
    logger.info('Redis: connected');
  });

  client.on('error', (err) => {
    logger.error({ err }, 'Redis: connection error');
  });

  client.on('close', () => {
    logger.warn('Redis: connection closed');
  });

  return client;
}

export const redis = createRedisClient();

/**
 * Redis 연결 시작 (서버 시작 시 호출)
 */
export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
  } catch (err) {
    logger.error({ err }, 'Redis: failed to connect');
  }
}

/**
 * Redis 연결 해제 (graceful shutdown 시 호출)
 */
export async function disconnectRedis(): Promise<void> {
  try {
    await redis.quit();
    logger.info('Redis: disconnected');
  } catch (err) {
    logger.error({ err }, 'Redis: error during disconnect');
  }
}
