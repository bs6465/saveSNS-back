import express from 'express';
const router = express.Router(); // express의 라우터 기능을 사용
import * as profileController from '../controllers/profile.controller.ts';
import { verifyToken } from '../middleware/authMiddleware.ts';
import { validateBody } from '../middleware/validate.ts';
import * as authSchema from '../schema/auth.schema.ts';
import * as profileSchema from '../schema/profile.schema.ts';

/*
프로필 routes
*/

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: 내 프로필 조회
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 프로필 조회 성공
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
router.get('/', [verifyToken], profileController.getProfile); // GET / 프로필 조회

/**
 * @swagger
 * /profile:
 *   patch:
 *     summary: 프로필 수정
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname:
 *                 type: string
 *                 description: 닉네임
 *     responses:
 *       200:
 *         description: 프로필 수정 성공
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
router.patch('/', [verifyToken], profileController.updateProfile); // PATCH / 프로필 수정

/**
 * @swagger
 * /profile/posts:
 *   get:
 *     summary: 내 게시글 목록 조회
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 내 게시글 목록 조회 성공
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
router.get('/posts', [verifyToken], profileController.getUserPosts); // GET /posts 내 게시글 목록

/**
 * @swagger
 * /profile/location:
 *   post:
 *     summary: 위치 정보 저장
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [longitude, latitude]
 *             properties:
 *               longitude:
 *                 type: number
 *                 description: 경도
 *               latitude:
 *                 type: number
 *                 description: 위도
 *     responses:
 *       200:
 *         description: 위치 정보 저장 성공
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
  '/location',
  [verifyToken, validateBody(profileSchema.setLocationSchema)],
  profileController.setLocation,
); // POST /location 위치 정보 저장

export default router;
