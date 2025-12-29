import express from 'express';
const router = express.Router(); // express의 라우터 기능을 사용
import * as authController from '../controllers/auth.controller.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { validateBody, validateToken } from '../middleware/validate.js';
import * as authSchema from '../schema/auth.schema.js';

/*
로그인, 회원가입 routes
*/

// 경로와 컨트롤러 함수를 연결

router.get('/', verifyToken, authController.getUsers); // GET / 모든 유저 가져오기
router.post('/register', validateBody(authSchema.registerSchema), authController.register); // POST / 회원가입
router.post('/login', validateBody(authSchema.loginSchema), authController.login); // POST / 로그인
router.post('/logout', [verifyToken, validateToken(authSchema.checkAuth)], authController.logout); // POST / 로그아웃

export default router;
