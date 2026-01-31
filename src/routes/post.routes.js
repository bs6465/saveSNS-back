import express from 'express';
const router = express.Router(); // express의 라우터 기능을 사용
import * as postController from '../controllers/post.controller.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import * as authSchema from '../schema/auth.schema.js';
import * as postSchema from '../schema/post.schema.js';

/*
게시글 routes
*/

// 경로와 컨트롤러 함수를 연결
router.post(
  '/',
  [verifyToken, validateBody(postSchema.createPostSchema)],
  postController.createPost,
); // POST / 글 작성
router.get('/', [verifyToken, validateQuery(postSchema.getPostsSchema)], postController.getPosts); // GET / 글 목록 조회
router.get('/all', postController.getAllPosts); // GET / 글 전체 조회
router.get('/:postId', validateParams(postSchema.getPostByIdSchema), postController.getPostById); // GET /:postId 글 상세 조회
router.put(
  '/:postId',
  [verifyToken, validateBody(postSchema.updatePostSchema)],
  postController.updatePost,
); // PUT /:postId 글 수정
router.delete('/:postId', verifyToken, postController.deletePost); // DELETE /:postId 글 삭제

export default router;
