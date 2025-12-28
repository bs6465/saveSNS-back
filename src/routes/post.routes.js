import express from 'express';
const router = express.Router(); // express의 라우터 기능을 사용

/*
게시글 routes
*/

import * as authController from '../controllers/post.controller.js';
import { verifyToken, checkAuth } from ('../middleware/authMiddleware.js'); // 미들웨어 경로

// 경로와 컨트롤러 함수를 연결
router.post('/', [verifyToken, checkAuth], authController.createPost);
router.get('/', [verifyToken, checkAuth], authController.getPosts);
router.get('/all', authController.getAllPosts);

export default router;
