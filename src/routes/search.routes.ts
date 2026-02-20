import express from 'express';
const router = express.Router();
import * as searchController from '../controllers/search.controller.ts';
import { verifyToken } from '../middleware/authMiddleware.ts';
import { validateQuery } from '../middleware/validate.ts';
import * as searchSchema from '../schema/search.schema.ts';

/*
검색 routes
*/

/**
 * @swagger
 * /search/posts:
 *   get:
 *     summary: 게시글 검색
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: 검색어
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *         description: 경도
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *         description: 위도
 *       - in: query
 *         name: rangeMeters
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
 *     responses:
 *       200:
 *         description: 게시글 검색 성공
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
router.get(
  '/posts',
  [verifyToken, validateQuery(searchSchema.searchPostsSchema)],
  searchController.searchPosts,
); // GET /posts?q= 게시글 검색

/**
 * @swagger
 * /search/users:
 *   get:
 *     summary: 사용자 검색
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: 검색어
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
 *     responses:
 *       200:
 *         description: 사용자 검색 성공
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
router.get(
  '/users',
  [verifyToken, validateQuery(searchSchema.searchUsersSchema)],
  searchController.searchUsers,
); // GET /users?q= 사용자 검색

export default router;
