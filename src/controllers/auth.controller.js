// auth.controller.js
import { prisma } from '../prismaClient.js';
import auth from '../utils/password.utils.js';
import jwttoken from '../utils/jwttoken.utils.js';
// import { getIo } from '../websocket';
import { successResponse, errorResponse } from '../utils/response.utils.js';

/*
로그인, 회원가입 로직
*/

// 회원가입
export const register = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.create({
      data: {
        username,
        password: await auth.hashPassword(password),
      },
    });
    return successResponse(res, '회원가입 성공', { userId: user.userId }, 201);
  } catch (err) {
    console.error(err);
    return errorResponse(res, '유저를 찾을 수 없습니다.', null, 404);
  }
};

// 가져오기 개발자용
export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        userId: true,
        username: true,
        password: true,
      },
    });
    return successResponse(res, '유저 목록 조회 성공', users, 200);
  } catch (err) {
    console.error(err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};

//
export const getMe = async (req, res) => {
  const { userId } = req.user;
  try {
    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        username: true,
      },
    });
    return successResponse(res, 'GetMe 성공', user, 200);
  } catch (err) {
    console.error('GetMe 에러:', err);
    return errorResponse(res, '서버 에러', null, 500);
  }
};
