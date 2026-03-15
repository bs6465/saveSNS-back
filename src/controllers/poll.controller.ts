import * as pollService from '../services/poll.service.ts';
import { successResponse } from '../utils/response.utils.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';
import { NotFoundError, ForbiddenError, ConflictError } from '../errors/index.ts';
import { emitToPoll } from '../config/socket.ts';

export const createPoll = asyncHandler(async (req, res) => {
  const { userId } = req.user!;
  const { title, options, durationHours, description, longitude, latitude } = req.body;

  const poll = await pollService.createPoll(
    userId,
    title,
    options,
    durationHours ?? 24,
    description,
    longitude,
    latitude,
  );

  return successResponse(res, '투표 생성 성공', poll, 201);
});

export const getPolls = asyncHandler(async (req, res) => {
  const { userId } = req.user!;
  const cursor = req.query.cursor as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

  const polls = await pollService.getPolls(userId, cursor, limit);
  return successResponse(res, '투표 목록 조회 성공', polls, 200);
});

export const getPollById = asyncHandler(async (req, res) => {
  const { userId } = req.user!;
  const pollId = req.params.pollId as string;

  const poll = await pollService.getPollById(pollId, userId);
  if (!poll) {
    throw new NotFoundError('투표');
  }

  return successResponse(res, '투표 조회 성공', poll, 200);
});

export const votePoll = asyncHandler(async (req, res) => {
  const { userId } = req.user!;
  const pollId = req.params.pollId as string;
  const { optionId } = req.body;

  // 투표 존재 및 활성 상태 확인
  const existingPoll = await pollService.getPollById(pollId, userId);
  if (!existingPoll) {
    throw new NotFoundError('투표');
  }
  if (!existingPoll.isActive || new Date(existingPoll.expiresAt) < new Date()) {
    throw new ForbiddenError('이미 종료된 투표입니다.');
  }
  if (existingPoll.myVoteOptionId) {
    throw new ConflictError('이미 투표하셨습니다.');
  }

  // 선택지 유효성 검증
  const validOption = existingPoll.options.find((o) => o.optionId === optionId);
  if (!validOption) {
    throw new NotFoundError('선택지');
  }

  const updatedPoll = await pollService.votePoll(pollId, optionId, userId);

  // Socket.IO로 실시간 투표 결과 브로드캐스트
  emitToPoll(pollId, 'poll:updated', updatedPoll);

  return successResponse(res, '투표 완료', updatedPoll, 200);
});

export const closePoll = asyncHandler(async (req, res) => {
  const { userId } = req.user!;
  const pollId = req.params.pollId as string;

  const poll = await pollService.getPollById(pollId, userId);
  if (!poll) {
    throw new NotFoundError('투표');
  }
  if (poll.userId !== userId) {
    throw new ForbiddenError('투표 종료 권한이 없습니다.');
  }

  await pollService.closePoll(pollId);

  // Socket.IO로 투표 종료 브로드캐스트
  emitToPoll(pollId, 'poll:closed', { pollId });

  return successResponse(res, '투표가 종료되었습니다', null, 200);
});

export const getMyPolls = asyncHandler(async (req, res) => {
  const { userId } = req.user!;
  const polls = await pollService.getMyPolls(userId);
  return successResponse(res, '내 투표 목록 조회 성공', polls, 200);
});
