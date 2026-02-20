// media.routes.ts
import express from 'express';
const router = express.Router();
import * as mediaController from '../controllers/media.controller.ts';
import { verifyToken } from '../middleware/authMiddleware.ts';

/*
미디어 routes
*/

/**
 * @swagger
 * /media/upload:
 *   post:
 *     summary: 미디어 업로드
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [images]
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: "Base64 인코딩된 이미지 배열 (최대 5개)"
 *     responses:
 *       201:
 *         description: 미디어 업로드 성공
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
// POST /api/media/upload - 미디어 업로드 (최대 5개, Base64 JSON)
router.post('/upload', verifyToken, mediaController.uploadMedia);

/**
 * @swagger
 * /media/{postId}:
 *   get:
 *     summary: 게시글 미디어 목록 조회
 *     tags: [Media]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: 게시글 ID
 *     responses:
 *       200:
 *         description: 미디어 목록 조회 성공
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
// GET /api/media/:postId - 게시글의 미디어 목록 조회
router.get('/:postId', mediaController.getMediaByPostId);

/**
 * @swagger
 * /media/{mediaId}:
 *   delete:
 *     summary: 미디어 삭제
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *         description: 미디어 ID
 *     responses:
 *       200:
 *         description: 미디어 삭제 성공
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
 *         description: 미디어를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// DELETE /api/media/:mediaId - 미디어 삭제
router.delete('/:mediaId', verifyToken, mediaController.deleteMedia);

export default router;
