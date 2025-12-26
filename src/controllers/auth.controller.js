// auth.controller.js
import * as authService from '../services/auth.service.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
// import { getIo } from '../websocket';

/*
로그인, 회원가입 로직
*/

// POST /api/auth/register 회원가입
export const register = async (req, res) => {
  const { username, password } = req.body;

  // 간단한 유효성 검사 (라이브러리 사용 권장)
  if (!username || !password) {
    return errorResponse(res, '필수 입력값이 누락되었습니다.', null, 400);
  }

  try {
    const { token } = await authService.registerUser(username, password);
    return successResponse(res, '회원가입 성공', { token }, 201);
  } catch (err) {
    console.error(err);
    if (err.message === 'DUPLICATE_USER') {
      return errorResponse(res, '이미 존재하는 사용자입니다.', null, 409);
    }
    return errorResponse(res, '회원가입 실패', null, 500);
  }
};

// GET /api/auth/ 가져오기 개발자용
export const getUsers = async (req, res) => {
  try {
    const users = await authService.getAllUsers();
    return successResponse(res, '유저 목록 조회 성공', users, 200);
  } catch (err) {
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// GET /api/auth/me 내 정보 가져오기
export const getMe = async (req, res) => {
  const { userId } = req.user;
  if (!userId) {
    return errorResponse(res, '로그인이 필요합니다.', null, 401);
  }
  try {
    const user = await authService.getUserById(userId);
    return successResponse(res, '내 정보 조회 성공', user, 200);
  } catch (err) {
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// POST /api/auth/login 로그인
export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const { token } = await authService.authenticateUser(username, password);

    if (!token) {
      // 보안상 "아이디가 틀림" vs "비번이 틀림"을 구분해서 알려주는 것은 좋지 않음
      return errorResponse(res, '아이디 또는 비밀번호가 잘못되었습니다.', null, 401);
    }
    console.log(`token: ${token}`);
    return successResponse(res, '로그인 성공', { token }, 200);
  } catch (err) {
    console.error(err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};

// POST /api/auth/logout 로그아웃
export const logout = async (req, res) => {
  // JWT 기반 인증에서는 서버에서 별도의 로그아웃 처리가 필요하지 않습니다.
  // 클라이언트 측에서 토큰을 삭제하면 됩니다.
  return successResponse(res, '로그아웃 성공', null, 200);
};
