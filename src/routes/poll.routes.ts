import express from 'express';
const router = express.Router();
import * as pollController from '../controllers/poll.controller.ts';
import { verifyToken } from '../middleware/authMiddleware.ts';
import { validateBody } from '../middleware/validate.ts';
import { createPollSchema, votePollSchema } from '../schema/poll.schema.ts';

// POST /api/polls - 투표 생성
router.post('/', verifyToken, validateBody(createPollSchema), pollController.createPoll);

// GET /api/polls - 투표 목록 조회
router.get('/', verifyToken, pollController.getPolls);

// GET /api/polls/my - 내 투표 목록
router.get('/my', verifyToken, pollController.getMyPolls);

// GET /api/polls/:pollId - 투표 상세 조회
router.get('/:pollId', verifyToken, pollController.getPollById);

// POST /api/polls/:pollId/vote - 투표 참여
router.post('/:pollId/vote', verifyToken, validateBody(votePollSchema), pollController.votePoll);

// PATCH /api/polls/:pollId/close - 투표 종료
router.patch('/:pollId/close', verifyToken, pollController.closePoll);

export default router;
