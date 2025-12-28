import express from 'express';
const router = express.Router(); // express의 라우터 기능을 사용
import * as authController from '../controllers/auth.controller.js';
import { verifyToken, checkAuth } from '../middleware/authMiddleware.js';

/*
로그인, 회원가입 routes
*/

// 경로와 컨트롤러 함수를 연결

router.get('/', verifyToken, authController.getUsers);                // GET / 모든 유저 가져오기
router.get('/me', [verifyToken, checkAuth], authController.getMe);    // GET / 내 정보 가져오기
router.post('/register', authController.register);                    // POST / 회원가입
router.post('/login', authController.login);                          // POST / 로그인
router.post('/logout', [verifyToken], authController.logout);         // POST / 로그아웃

export default router; // ES6 모듈 방식
