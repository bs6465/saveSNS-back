import * as authService from '../services/auth.service.ts';
import { successResponse } from '../utils/response.utils.ts';
import { asyncHandler } from '../middleware/asyncHandler.ts';
import logger from '../config/logger.ts';

// state에서 앱 redirect URI를 추출하거나 fallback HTML 페이지로
function buildRedirectUrl(appRedirect: string | null, params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  if (appRedirect) {
    // 커스텀 스킴으로 리다이렉트 (exp:// 또는 savesns://)
    const separator = appRedirect.includes('?') ? '&' : '?';
    return `${appRedirect}${separator}${qs}`;
  }
  // fallback: HTTPS 성공 페이지 (브라우저에서 직접 접속한 경우)
  return `https://api.save-sns.com/api/auth/success?${qs}`;
}

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

// 카카오 인가 코드 콜백 → JWT 발급 후 앱으로 커스텀 스킴 redirect
export const kakaoCallback = asyncHandler(async (req, res) => {
  logger.info({ query: req.query }, 'Kakao callback received');
  const code = req.query.code as string;
  const state = req.query.state as string | undefined;
  const appRedirect = authService.parseAppRedirectFromState(state);

  if (!code) {
    logger.warn('Kakao callback: no code in query');
    return res.redirect(buildRedirectUrl(appRedirect, { error: 'no_code', provider: 'kakao' }));
  }

  try {
    const { token } = await authService.handleKakaoCallback(code);
    logger.info('Kakao callback: login success');
    return res.redirect(buildRedirectUrl(appRedirect, { token, provider: 'kakao' }));
  } catch (err) {
    logger.error({ err }, 'Kakao callback: auth failed');
    return res.redirect(buildRedirectUrl(appRedirect, { error: 'auth_failed', provider: 'kakao' }));
  }
});

// 카카오 인증 URL 반환 (앱에서 직접 열기)
export const kakaoAuthUrl = asyncHandler(async (req, res) => {
  const appRedirect = req.query.app_redirect as string | undefined;
  const url = authService.getKakaoAuthUrl(appRedirect);
  return successResponse(res, '카카오 인증 URL', { url }, 200);
});

// Google 인가 코드 콜백 → JWT 발급 후 앱으로 커스텀 스킴 redirect
export const googleCallback = asyncHandler(async (req, res) => {
  logger.info({ query: req.query }, 'Google callback received');
  const code = req.query.code as string;
  const state = req.query.state as string | undefined;
  const appRedirect = authService.parseAppRedirectFromState(state);

  if (!code) {
    logger.warn('Google callback: no code in query');
    return res.redirect(buildRedirectUrl(appRedirect, { error: 'no_code', provider: 'google' }));
  }

  try {
    const { token } = await authService.handleGoogleCallback(code);
    logger.info('Google callback: login success');
    return res.redirect(buildRedirectUrl(appRedirect, { token, provider: 'google' }));
  } catch (err) {
    logger.error({ err }, 'Google callback: auth failed');
    return res.redirect(
      buildRedirectUrl(appRedirect, { error: 'auth_failed', provider: 'google' }),
    );
  }
});

// Google 인증 URL 반환
export const googleAuthUrl = asyncHandler(async (req, res) => {
  const appRedirect = req.query.app_redirect as string | undefined;
  const url = authService.getGoogleAuthUrl(appRedirect);
  return successResponse(res, 'Google 인증 URL', { url }, 200);
});

// OAuth 성공 페이지 (openAuthSessionAsync가 감지 못한 경우 fallback)
export const authSuccess = asyncHandler(async (req, res) => {
  const token = (req.query.token as string) ?? '';
  const error = (req.query.error as string) ?? '';
  const provider = (req.query.provider as string) ?? '';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SaveSNS 로그인</title>
<style>body{display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:sans-serif;background:#f5f5f5}div{text-align:center}h2{color:#333}p{color:#666}</style>
</head><body><div><h2>✅ 로그인 성공</h2><p>앱으로 돌아갑니다...</p><p style="margin-top:20px"><a href="savesns://auth/callback?token=${encodeURIComponent(token)}&error=${encodeURIComponent(error)}&provider=${encodeURIComponent(provider)}">앱이 열리지 않으면 터치하세요</a></p></div></body></html>`);
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
  const provider = String(req.params.provider ?? '');
  await authService.unlinkSocialAccount(req.user!.userId, provider);
  return successResponse(res, '소셜 계정 연동 해제 성공', null, 200);
});

export const getLinkedAccounts = asyncHandler(async (req, res) => {
  const accounts = await authService.getLinkedAccounts(req.user!.userId);
  return successResponse(res, '연동된 소셜 계정 조회 성공', accounts, 200);
});
