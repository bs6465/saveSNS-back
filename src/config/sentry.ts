import * as Sentry from '@sentry/node';
import logger from './logger.ts';

let initialized = false;

export const initSentry = (): void => {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info('Sentry DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },
  });
  initialized = true;
  logger.info('Sentry error tracking initialized');
};

export const captureError = (err: Error, context: Record<string, unknown> = {}): void => {
  if (!initialized) return;

  Sentry.withScope((scope) => {
    if (context.userId) scope.setUser({ id: context.userId as string });
    if (context.requestId) scope.setTag('requestId', context.requestId as string);
    if (context.path) scope.setTag('path', context.path as string);
    scope.setExtras(context);
    Sentry.captureException(err);
  });
};

export const sentryErrorHandler = initialized
  ? Sentry.setupExpressErrorHandler
  : () => (_req: unknown, _res: unknown, next: () => void) => next();

export default { initSentry, captureError };
