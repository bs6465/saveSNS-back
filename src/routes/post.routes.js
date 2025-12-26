import express from 'express';
const router = express.Router(); // express의 라우터 기능을 사용

/*
게시글 routes
*/

import * as authController from '../controllers/post.controller.js';
// const { verifyToken, checkAuth } = require('../middleware/authMiddleware'); // 미들웨어 경로

// 2. 경로와 컨트롤러 함수를 연결
// GET / 모든 글 가져오기
// router.get('/', authController.getUsers);
router.post('/', authController.createPost);
router.get('/', authController.getPosts);
router.get('/all', authController.getAllPosts);

export default router;
