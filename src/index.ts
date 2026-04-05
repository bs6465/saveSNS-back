import 'dotenv/config'; // ES6 방식으로 환경변수 로드
import { validateEnv } from './config/env.ts';
validateEnv(); // 필수 환경변수 검증 (fail fast)

import express, { type Request, type Response } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import path from 'path';
import { fileURLToPath } from 'url';
import { APP_CONFIG, CORS_CONFIG, RATE_LIMIT, FILE_UPLOAD } from './config/constants.ts';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.ts';
import { xssSanitizer } from './middleware/xssSanitizer.ts';
import { initSentry } from './config/sentry.ts';
import { metricsMiddleware, getMetricsText, setGauge } from './config/metrics.ts';
import logger, { genReqId } from './config/logger.ts';
import { prisma } from './prismaClient.ts';
import { connectRedis, disconnectRedis, redis } from './config/redis.ts';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.ts';

const app = express();
const { port } = APP_CONFIG;

// Cloudflare Tunnel / 리버스 프록시 뒤에서 실행되므로 trust proxy 설정
app.set('trust proxy', 1);

// Sentry 에러 트래킹 초기화 (SENTRY_DSN 환경변수가 설정된 경우에만)
initSentry();

// 1. 전역 미들웨어 설정

// 보안 헤더 (Helmet) - 첫 번째 미들웨어
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

// CORS 설정 - 허용된 origin만 접근 가능
const corsOptions: cors.CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || CORS_CONFIG.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
      // localhost의 모든 포트 허용 (Expo 웹 개발 서버 포트가 동적으로 변경됨)
      callback(null, true);
    } else {
      logger.warn({ origin }, 'Blocked by CORS');
      callback(new Error('CORS 정책에 의해 차단되었습니다'));
    }
  },
  credentials: CORS_CONFIG.credentials,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// HTTP 요청 로깅 (pino-http)
app.use(
  pinoHttp({
    logger,
    genReqId,
    autoLogging: {
      ignore: (req) => req.url === '/health',
    },
  }),
);

// Rate limiting - API 남용 방지
const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT.windowMs,
  max: RATE_LIMIT.maxRequests,
  message: { success: false, message: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 인증 라우트용 더 엄격한 Rate limiting
const authLimiter = rateLimit({
  windowMs: RATE_LIMIT.authWindowMs,
  max: RATE_LIMIT.authMaxRequests,
  message: { success: false, message: '로그인 시도가 너무 많습니다. 1시간 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// JSON 파싱 (Base64 이미지 업로드용 크기 증가)
app.use(express.json({ limit: '50mb' }));

// XSS 방어 미들웨어
app.use(xssSanitizer());

// Prometheus 메트릭 수집 미들웨어
app.use(metricsMiddleware());

// 로컬 스토리지 모드: 업로드 파일 정적 서빙
if (process.env.STORAGE_TYPE === 'local') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const uploadsPath = path.resolve(__dirname, '../uploads');
  app.use('/uploads', express.static(uploadsPath));
  logger.info(`[Local Storage] Serving uploads from: ${uploadsPath}`);
}

// Health Check 엔드포인트
app.get('/health', async (req: Request, res: Response) => {
  const health: Record<string, unknown> = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    health.database = 'connected';
    setGauge('database_connection_status', {}, 1);
  } catch (err) {
    health.status = 'degraded';
    health.database = 'disconnected';
    setGauge('database_connection_status', {}, 0);
    logger.error({ err }, 'Health check: database unreachable');
  }

  try {
    await redis.ping();
    health.redis = 'connected';
  } catch (err) {
    health.status = 'degraded';
    health.redis = 'disconnected';
    logger.error({ err }, 'Health check: redis unreachable');
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  return res.status(statusCode).json(health);
});

// Prometheus 메트릭 엔드포인트
app.get('/metrics', async (req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send(await getMetricsText());
});

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});
app.get('/api', (req: Request, res: Response) => {
  res.send('Hello World!');
});

// API 문서 (개발 환경에서만)
if (APP_CONFIG.nodeEnv !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  logger.info('Swagger docs available at /api-docs');
}

// 2. 라우터(Routes) 임포트 및 설정

// 인증 라우트 (콜백/auth-url은 일반 rate limit 적용)
import authRoutes from './routes/auth.routes.ts';
app.use('/api/auth', apiLimiter, authRoutes);

// API 라우트에 일반 rate limiting 적용
app.use('/api/', apiLimiter);

// 글 관련 라우트
import postRoutes from './routes/post.routes.ts';
app.use('/api/posts', postRoutes);

import profileRoutes from './routes/profile.routes.ts';
app.use('/api/profile', profileRoutes);

import weatherRoutes from './routes/weather.routes.ts';
app.use('/api/weather', weatherRoutes);

import mediaRoutes from './routes/media.routes.ts';
app.use('/api/media', mediaRoutes);

import airqualityRoutes from './routes/airquality.routes.ts';
app.use('/api/airquality', airqualityRoutes);

import trafficRoutes from './routes/traffic.routes.ts';
app.use('/api/traffic', trafficRoutes);

import newsRoutes from './routes/news.routes.ts';
app.use('/api/news', newsRoutes);

import commentRoutes from './routes/comment.routes.ts';
app.use('/api/comments', commentRoutes);

import notificationRoutes from './routes/notification.routes.ts';
app.use('/api/notifications', notificationRoutes);

import searchRoutes from './routes/search.routes.ts';
app.use('/api/search', searchRoutes);

import urgencyRoutes from './routes/urgency.routes.ts';
app.use('/api/urgency', urgencyRoutes);

import shelterRoutes from './routes/shelter.routes.ts';
app.use('/api/shelters', shelterRoutes);

import pollRoutes from './routes/poll.routes.ts';
app.use('/api/polls', pollRoutes);

// 3. 에러 처리 미들웨어 (모든 라우트 후에 등록)
app.use(notFoundHandler); // 404 처리
app.use(errorHandler); // 글로벌 에러 핸들러

// ------------------------------------
// Express와 WebSocket 서버 통합
// ------------------------------------
const server = http.createServer(app);

import { initSocketIO } from './config/socket.ts';
initSocketIO(server);

// 4. 서버 실행
await connectRedis();

server.listen({ port, host: '0.0.0.0' }, () => {
  logger.info(`Server is running on port ${port} in ${APP_CONFIG.nodeEnv} mode`);
});

// 5. Graceful Shutdown
function gracefulShutdown(signal: string): void {
  logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown');

  server.close(async () => {
    logger.info('HTTP server closed');
    try {
      await disconnectRedis();
      await prisma.$disconnect();
      logger.info('Database and Redis connections closed');
    } catch (err) {
      logger.error({ err }, 'Error during disconnect');
    }
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
