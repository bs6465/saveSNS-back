import express from 'express';
const router = express.Router();
import * as authController from '../controllers/auth.controller.ts';
import { verifyToken } from '../middleware/authMiddleware.ts';
import { validateBody } from '../middleware/validate.ts';
import * as authSchema from '../schema/auth.schema.ts';

/*
소셜 로그인, 계정 연동 routes
*/

// ─── 소셜 로그인 (Public) ──────────────────────

/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Google 소셜 로그인
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Google ID Token
 *     responses:
 *       200:
 *         description: 로그인 성공
 */
router.post('/google', validateBody(authSchema.googleLoginSchema), authController.googleLogin);

/**
 * @swagger
 * /auth/kakao:
 *   post:
 *     summary: 카카오 소셜 로그인
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [accessToken]
 *             properties:
 *               accessToken:
 *                 type: string
 *                 description: 카카오 Access Token
 *     responses:
 *       200:
 *         description: 로그인 성공
 */
router.post('/kakao', validateBody(authSchema.kakaoLoginSchema), authController.kakaoLogin);

// 카카오 백엔드 콜백 (GET - 카카오가 redirect로 호출)
router.get('/kakao/callback', authController.kakaoCallback);

// 카카오 인증 URL 조회 (앱에서 WebBrowser로 열기)
router.get('/kakao/auth-url', authController.kakaoAuthUrl);

// Google 백엔드 콜백 (GET - Google이 redirect로 호출)
router.get('/google/callback', authController.googleCallback);

// Google 인증 URL 조회 (앱에서 WebBrowser로 열기)
router.get('/google/auth-url', authController.googleAuthUrl);

// OAuth 성공 페이지 (openAuthSessionAsync가 감지하는 HTTPS URL)
router.get('/success', authController.authSuccess);

// ─── 토큰 관리 (Protected) ─────────────────────

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: 토큰 갱신
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 토큰 갱신 성공
 */
router.post('/refresh-token', verifyToken, authController.refreshToken);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: 로그아웃
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 */
router.post('/logout', verifyToken, authController.logout);

// ─── 계정 연동 (Protected) ─────────────────────

/**
 * @swagger
 * /auth/link:
 *   get:
 *     summary: 연동된 소셜 계정 목록 조회
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 연동된 소셜 계정 목록
 *   post:
 *     summary: 소셜 계정 연동
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [provider, token]
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [google, kakao]
 *               token:
 *                 type: string
 *                 description: 소셜 인증 토큰 (Google ID Token 또는 카카오 Access Token)
 *     responses:
 *       200:
 *         description: 연동 성공
 */
router.get('/link', verifyToken, authController.getLinkedAccounts);
router.post(
  '/link',
  verifyToken,
  validateBody(authSchema.linkAccountSchema),
  authController.linkAccount,
);

/**
 * @swagger
 * /auth/link/{provider}:
 *   delete:
 *     summary: 소셜 계정 연동 해제
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, kakao]
 *     responses:
 *       200:
 *         description: 연동 해제 성공
 */
router.delete('/link/:provider', verifyToken, authController.unlinkAccount);

// ─── 관리용 (Protected) ────────────────────────

router.get('/', verifyToken, authController.getUsers);

export default router;
