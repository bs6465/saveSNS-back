import 'dotenv/config'; // ES6 방식으로 환경변수 로드
import express from 'express';
import http from 'http';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { APP_CONFIG, CORS_CONFIG, RATE_LIMIT, FILE_UPLOAD } from './config/constants.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
// import { initSocketIO } from './websocket'; // 웹소켓 핸들러 가져오기

const app = express();
const { port } = APP_CONFIG;

// 1. 전역 미들웨어 설정

// CORS 설정 - 허용된 origin만 접근 가능
const corsOptions = {
  origin: CORS_CONFIG.allowedOrigins,
  credentials: CORS_CONFIG.credentials,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

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

// 로컬 스토리지 모드: 업로드 파일 정적 서빙
if (process.env.STORAGE_TYPE === 'local') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const uploadsPath = path.resolve(__dirname, '../uploads');
  app.use('/uploads', express.static(uploadsPath));
  console.log(`[Local Storage] Serving uploads from: ${uploadsPath}`);
}

app.get('/', (req, res) => {
  res.send('Hello World!');
});
app.get('/api', (req, res) => {
  res.send('Hello World!');
});

// 2. 라우터(Routes) 임포트 및 설정

// 인증 라우트 (더 엄격한 rate limiting 적용)
import authRoutes from './routes/auth.routes.js';
app.use('/api/auth', authLimiter, authRoutes);

// API 라우트에 일반 rate limiting 적용
app.use('/api/', apiLimiter);

// 글 관련 라우트
import postRoutes from './routes/post.routes.js';
app.use('/api/posts', postRoutes);

import profileRoutes from './routes/profile.routes.js';
app.use('/api/profile', profileRoutes);

import weatherRoutes from './routes/weather.routes.js';
app.use('/api/weather', weatherRoutes);

import mediaRoutes from './routes/media.routes.js';
app.use('/api/media', mediaRoutes);

import airqualityRoutes from './routes/airquality.routes.js';
app.use('/api/airquality', airqualityRoutes);

import trafficRoutes from './routes/traffic.routes.js';
app.use('/api/traffic', trafficRoutes);

import newsRoutes from './routes/news.routes.js';
app.use('/api/news', newsRoutes);

import commentRoutes from './routes/comment.routes.js';
app.use('/api/comments', commentRoutes);

import notificationRoutes from './routes/notification.routes.js';
app.use('/api/notifications', notificationRoutes);

// 3. 에러 처리 미들웨어 (모든 라우트 후에 등록)
app.use(notFoundHandler); // 404 처리
app.use(errorHandler); // 글로벌 에러 핸들러

// ------------------------------------
// Express와 WebSocket 서버 통합
// ------------------------------------
const server = http.createServer(app);
// initSocketIO(server);

// 4. 서버 실행
server.listen(port, () => {
  console.log(`Server is running on port ${port} in ${APP_CONFIG.nodeEnv} mode`);
});
