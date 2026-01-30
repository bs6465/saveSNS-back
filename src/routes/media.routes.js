// media.routes.js
import express from 'express';
const router = express.Router();
import * as mediaController from '../controllers/media.controller.js';
import { verifyToken } from '../middleware/authMiddleware.js';

/*
미디어 routes
*/

// POST /api/media/upload - 미디어 업로드 (최대 5개, Base64 JSON)
router.post('/upload', verifyToken, mediaController.uploadMedia);

// GET /api/media/:postId - 게시글의 미디어 목록 조회
router.get('/:postId', mediaController.getMediaByPostId);

// DELETE /api/media/:mediaId - 미디어 삭제
router.delete('/:mediaId', verifyToken, mediaController.deleteMedia);

export default router;
