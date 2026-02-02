import express from 'express';
const router = express.Router();
import * as commentController from '../controllers/comment.controller.js';
import { verifyToken } from '../middleware/authMiddleware.js';

/*
댓글 routes
*/

// PUT /api/comments/:commentId - 댓글 수정
router.put('/:commentId', verifyToken, commentController.updateComment);

// DELETE /api/comments/:commentId - 댓글 삭제
router.delete('/:commentId', verifyToken, commentController.deleteComment);

export default router;
