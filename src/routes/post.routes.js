import express from 'express';
const router = express.Router(); // express의 라우터 기능을 사용
import * as authController from '../controllers/post.controller.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { validateBody, validateToken } from '../middleware/validate.js';
import * as authSchema from '../schema/auth.schema.js';
import * as postSchema from '../schema/post.schema.js';

/*
게시글 routes
*/

// 경로와 컨트롤러 함수를 연결
router.post(
  '/',
  [verifyToken, validateToken(authSchema.checkAuth), validateBody(postSchema.createPostSchema)],
  authController.createPost,
); // POST / 글 작성
router.get(
  '/',
  [verifyToken, validateToken(authSchema.checkAuth), validateBody(postSchema.getPostsSchema)],
  authController.getPosts,
); // GET / 글 목록 조회
router.get('/all', authController.getAllPosts); // GET / 글 전체 조회

export default router;
