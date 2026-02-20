import pino from 'pino';
import crypto from 'crypto';
import type { IncomingMessage } from 'http';

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
});

export function genReqId(req: IncomingMessage): string {
  return (req.headers['x-request-id'] as string) || crypto.randomUUID();
}

export default logger;
