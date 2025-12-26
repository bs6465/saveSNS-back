import express from 'express';
const router = express.Router(); // express의 라우터 기능을 사용

/*
로그인, 회원가입 routes
*/

// 1. 실제 로직이 담긴 '컨트롤러'를 임포트
// const authController = require('../controllers/auth.controller');
import * as authController from '../controllers/auth.controller.js';
// const { verifyToken, checkAuth } = require('../middleware/authMiddleware'); // 미들웨어 경로

// 2. 경로와 컨트롤러 함수를 연결
// GET / 모든 유저 가져오기
// router.get('/', authController.getUsers);
router.get('/', authController.getUsers);
router.get('/me', authController.getMe);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

export default router; // ES6 모듈 방식
