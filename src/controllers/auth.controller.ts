import * as authService from '../services/auth.service.ts';
import { successResponse } from '../utils/response.utils.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';

export const register = asyncHandler(async (req, res) => {
  const { username, password, longitude, latitude } = req.body;
  const { token } = await authService.registerUser(username, password, longitude, latitude);
  return successResponse(res, '회원가입 성공', { token }, 201);
});

export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const result = await authService.authenticateUser(username, password);
  return successResponse(res, '로그인 성공', { token: result!.token }, 200);
});

export const refreshToken = asyncHandler(async (req, res) => {
  const oldToken = (
    req as unknown as { user: { userId: string; username: string; nickname: string | null } }
  ).user;
  const { token: newToken } = await authService.refreshToken(oldToken);
  return successResponse(res, '토큰 검증 및 갱신 성공', { token: newToken }, 200);
});

export const getUsers = asyncHandler(async (_req, res) => {
  const users = await authService.getAllUsers();
  return successResponse(res, '유저 목록 조회 성공', users, 200);
});

export const logout = asyncHandler(async (_req, res) => {
  return successResponse(res, '로그아웃 성공', null, 200);
});
