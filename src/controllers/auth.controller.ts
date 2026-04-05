import * as authService from '../services/auth.service.ts';
import { successResponse } from '../utils/response.utils.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';
import logger from '../config/logger.ts';

export const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;
  const { token } = await authService.authenticateWithGoogle(idToken);
  return successResponse(res, 'Google 로그인 성공', { token }, 200);
});

export const kakaoLogin = asyncHandler(async (req, res) => {
  const { accessToken } = req.body;
  const { token } = await authService.authenticateWithKakao(accessToken);
  return successResponse(res, '카카오 로그인 성공', { token }, 200);
});

// 카카오 인가 코드 콜백 → JWT 발급 후 앱으로 딥링크 redirect
export const kakaoCallback = asyncHandler(async (req, res) => {
  logger.info({ query: req.query }, 'Kakao callback received');
  const code = req.query.code as string;
  if (!code) {
    logger.warn('Kakao callback: no code in query');
    return res.redirect('savesns://auth/kakao/callback?error=no_code');
  }

  try {
    const { token } = await authService.handleKakaoCallback(code);
    logger.info('Kakao callback: login success');
    return res.redirect(`savesns://auth/kakao/callback?token=${token}`);
  } catch (err) {
    logger.error({ err }, 'Kakao callback: auth failed');
    return res.redirect('savesns://auth/kakao/callback?error=auth_failed');
  }
});

// 카카오 인증 URL 반환 (앱에서 직접 열기)
export const kakaoAuthUrl = asyncHandler(async (_req, res) => {
  const url = authService.getKakaoAuthUrl();
  return successResponse(res, '카카오 인증 URL', { url }, 200);
});

// Google 인가 코드 콜백 → JWT 발급 후 앱으로 딥링크 redirect
export const googleCallback = asyncHandler(async (req, res) => {
  logger.info({ query: req.query }, 'Google callback received');
  const code = req.query.code as string;
  if (!code) {
    logger.warn('Google callback: no code in query');
    return res.redirect('savesns://auth/google/callback?error=no_code');
  }

  try {
    const { token } = await authService.handleGoogleCallback(code);
    logger.info('Google callback: login success');
    return res.redirect(`savesns://auth/google/callback?token=${token}`);
  } catch (err) {
    logger.error({ err }, 'Google callback: auth failed');
    return res.redirect('savesns://auth/google/callback?error=auth_failed');
  }
});

// Google 인증 URL 반환
export const googleAuthUrl = asyncHandler(async (_req, res) => {
  const url = authService.getGoogleAuthUrl();
  return successResponse(res, 'Google 인증 URL', { url }, 200);
});

export const refreshToken = asyncHandler(async (req, res) => {
  const { token: newToken } = await authService.refreshToken(req.user!);
  return successResponse(res, '토큰 갱신 성공', { token: newToken }, 200);
});

export const getUsers = asyncHandler(async (_req, res) => {
  const users = await authService.getAllUsers();
  return successResponse(res, '유저 목록 조회 성공', users, 200);
});

export const logout = asyncHandler(async (_req, res) => {
  return successResponse(res, '로그아웃 성공', null, 200);
});

export const linkAccount = asyncHandler(async (req, res) => {
  const { provider, token } = req.body;
  await authService.linkSocialAccount(req.user!.userId, provider, token);
  return successResponse(res, '소셜 계정 연동 성공', null, 200);
});

export const unlinkAccount = asyncHandler(async (req, res) => {
  const { provider } = req.params;
  await authService.unlinkSocialAccount(req.user!.userId, provider);
  return successResponse(res, '소셜 계정 연동 해제 성공', null, 200);
});

export const getLinkedAccounts = asyncHandler(async (req, res) => {
  const accounts = await authService.getLinkedAccounts(req.user!.userId);
  return successResponse(res, '연동된 소셜 계정 조회 성공', accounts, 200);
});
