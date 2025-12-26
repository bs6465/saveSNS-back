// require('dotenv').config(); // 환경변수는 secrets와 configMap으로 대체됨
import express from 'express';
import http from 'http';
import cors from 'cors';
// import { initSocketIO } from './websocket'; // 웹소켓 핸들러 가져오기
const app = express();
const port = 3000;

// 1. 전역 미들웨어 설정
app.use(cors()); // CORS 설정
app.use(express.json()); // JSON 파싱

app.get('/', (req, res) => {
  res.send('Hello World!');
});
app.get('/api', (req, res) => {
  res.send('Hello World!');
});

// 2. 라우터(Routes) 임포트 및 설정
import authRoutes from './routes/auth.routes.js';
app.use('/api/auth', authRoutes);

// '/posts'로 시작하는 모든 요청은 post.routes.js 파일이 처리하도록 넘김
// 모든 글 작성, 조회 담당
import postRoutes from './routes/post.routes.js';
app.use('/api/posts', postRoutes);

// ------------------------------------
// Express와 WebSocket 서버 통합
// ------------------------------------
const server = http.createServer(app);
// initSocketIO(server);

// 3. 서버 실행
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
