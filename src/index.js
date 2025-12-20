// require('dotenv').config(); // 환경변수는 secrets와 configMap으로 대체됨
import { express } from 'express';
import { http } from 'http';
// import { initSocketIO } from './websocket'; // 웹소켓 핸들러 가져오기
const app = express();
const port = 3000;


// 1. 전역 미들웨어 설정
// app.use(cors());
app.use(express.json()); // JSON 파싱

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// 2. 라우터(Routes) 임포트
// '/auth'로 시작하는 모든 요청은 auth.routes.js 파일이 처리하도록 넘김
// 모든 유저, 로그인, 회원가입 담당
const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

// // 팀
// const teamRoutes = require('./routes/team.routes');
// app.use('/api/team', teamRoutes);

// // 체크리스트
// const taskRoutes = require('./routes/task.routes');
// app.use('/api/task', taskRoutes);

// // 캘린더 일정 표시
// const scheduleRoutes = require('./routes/schedule.routes');
// app.use('/api/schedules', scheduleRoutes);

// ------------------------------------
// Express와 WebSocket 서버 통합
// ------------------------------------
const server = http.createServer(app);
// initSocketIO(server);

// 3. 서버 실행
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
