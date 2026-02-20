import client from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

client.collectDefaultMetrics({ prefix: 'savesns_' });

const httpRequestsTotal = new client.Counter({
  name: 'savesns_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
});

const httpRequestDuration = new client.Histogram({
  name: 'savesns_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

const dbConnectionStatus = new client.Gauge({
  name: 'savesns_database_connection_status',
  help: 'Database connection status (1=connected, 0=disconnected)',
});

const errorsTotal = new client.Counter({
  name: 'savesns_errors_total',
  help: 'Total number of errors',
  labelNames: ['type'] as const,
});

export const incCounter = (name: string, labels: Record<string, string | number> = {}): void => {
  if (name === 'http_requests_total') httpRequestsTotal.inc(labels);
  else if (name === 'errors_total') errorsTotal.inc(labels);
};

export const setGauge = (
  _name: string,
  _labels: Record<string, string> = {},
  value: number,
): void => {
  dbConnectionStatus.set(value);
};

export const getMetricsText = async (): Promise<string> => {
  return client.register.metrics();
};

export const metricsMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.path === '/metrics' || req.path === '/health') {
      next();
      return;
    }

    const end = httpRequestDuration.startTimer();

    res.on('finish', () => {
      const route = req.route?.path || req.path;
      const method = req.method;
      const status = res.statusCode;

      end({ method, route });
      httpRequestsTotal.inc({ method, route, status });
    });

    next();
  };
};

export const resetMetrics = (): void => {
  client.register.resetMetrics();
};
