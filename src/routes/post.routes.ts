import express from 'express';
const router = express.Router(); // express의 라우터 기능을 사용
import * as postController from '../controllers/post.controller.ts';
import * as commentController from '../controllers/comment.controller.ts';
import * as likeController from '../controllers/like.controller.ts';
import { verifyToken } from '../middleware/authMiddleware.ts';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.ts';
import * as authSchema from '../schema/auth.schema.ts';
import * as postSchema from '../schema/post.schema.ts';

/*
게시글 routes
*/

// 경로와 컨트롤러 함수를 연결

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: 게시글 작성
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [contents, longitude, latitude]
 *             properties:
 *               contents:
 *                 type: string
 *                 description: 게시글 내용
 *               longitude:
 *                 type: number
 *                 description: 경도
 *               latitude:
 *                 type: number
 *                 description: 위도
 *               mediaUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 미디어 URL 목록
 *     responses:
 *       201:
 *         description: 게시글 작성 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/',
  [verifyToken, validateBody(postSchema.createPostSchema)],
  postController.createPost,
); // POST / 글 작성

/**
 * @swagger
 * /posts:
 *   get:
 *     summary: 주변 게시글 목록 조회
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *         description: 경도
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *         description: 위도
 *       - in: query
 *         name: rangeMeters
 *         required: true
 *         schema:
 *           type: number
 *         description: 검색 반경 (미터)
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: 페이지네이션 커서
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 조회 개수
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: 정렬 기준
 *     responses:
 *       200:
 *         description: 게시글 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', [verifyToken, validateQuery(postSchema.getPostsSchema)], postController.getPosts); // GET / 글 목록 조회

/**
 * @swagger
 * /posts/all:
 *   get:
 *     summary: 전체 게시글 조회
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: 전체 게시글 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get('/all', postController.getAllPosts); // GET / 글 전체 조회

/**
 * @swagger
 * /posts/{postId}:
 *   get:
 *     summary: 게시글 상세 조회
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: 게시글 ID
 *     responses:
 *       200:
 *         description: 게시글 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: 게시글을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:postId', validateParams(postSchema.getPostByIdSchema), postController.getPostById); // GET /:postId 글 상세 조회

/**
 * @swagger
 * /posts/{postId}:
 *   put:
 *     summary: 게시글 수정
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: 게시글 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contents:
 *                 type: string
 *                 description: 수정할 내용
 *     responses:
 *       200:
 *         description: 게시글 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 게시글을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put(
  '/:postId',
  [verifyToken, validateBody(postSchema.updatePostSchema)],
  postController.updatePost,
); // PUT /:postId 글 수정

/**
 * @swagger
 * /posts/{postId}:
 *   delete:
 *     summary: 게시글 삭제
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: 게시글 ID
 *     responses:
 *       200:
 *         description: 게시글 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 게시글을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:postId', verifyToken, postController.deletePost); // DELETE /:postId 글 삭제

// 댓글 관련 라우트

/**
 * @swagger
 * /posts/{postId}/comments:
 *   post:
 *     summary: 댓글 작성
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: 게시글 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 description: 댓글 내용
 *     responses:
 *       201:
 *         description: 댓글 작성 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 게시글을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:postId/comments', verifyToken, commentController.createComment); // POST /:postId/comments 댓글 작성

/**
 * @swagger
 * /posts/{postId}/comments:
 *   get:
 *     summary: 댓글 목록 조회
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: 게시글 ID
 *     responses:
 *       200:
 *         description: 댓글 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:postId/comments', verifyToken, commentController.getComments); // GET /:postId/comments 댓글 목록 조회

// 좋아요 관련 라우트

/**
 * @swagger
 * /posts/{postId}/like:
 *   post:
 *     summary: 좋아요 토글
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: 게시글 ID
 *     responses:
 *       200:
 *         description: 좋아요 토글 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:postId/like', verifyToken, likeController.toggleLike); // POST /:postId/like 좋아요 토글

/**
 * @swagger
 * /posts/{postId}/likes:
 *   get:
 *     summary: 좋아요 정보 조회
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: 게시글 ID
 *     responses:
 *       200:
 *         description: 좋아요 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:postId/likes', verifyToken, likeController.getLikeInfo); // GET /:postId/likes 좋아요 정보 조회

export default router;
