import * as authService from '../services/auth.service.ts';
import { successResponse } from '../utils/response.utils.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';
import { UnauthorizedError } from '../errors/AppError.ts';

export const register = asyncHandler(async (req, res) => {
  const { username, password, longitude, latitude } = req.body;
  const { token } = await authService.registerUser(username, password, longitude, latitude);
  return successResponse(res, '회원가입 성공', { token }, 201);
});

export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const result = await authService.authenticateUser(username, password);
  if (!result) {
    throw new UnauthorizedError('아이디 또는 비밀번호가 올바르지 않습니다');
  }
  return successResponse(res, '로그인 성공', { token: result.token }, 200);
});

export const refreshToken = asyncHandler(async (req, res) => {
  const { token: newToken } = await authService.refreshToken(req.user!);
  return successResponse(res, '토큰 검증 및 갱신 성공', { token: newToken }, 200);
});

export const getUsers = asyncHandler(async (_req, res) => {
  const users = await authService.getAllUsers();
  return successResponse(res, '유저 목록 조회 성공', users, 200);
});

export const logout = asyncHandler(async (_req, res) => {
  return successResponse(res, '로그아웃 성공', null, 200);
});
