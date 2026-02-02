import { prisma } from '../prismaClient.js';
import auth from '../utils/password.utils.js';
import jwttoken from '../utils/jwttoken.utils.js';

/* 
로그인, 회원가입 로직
*/

// POST /api/auth/register 회원가입 로직
export const registerUser = async (username, password, longitude, latitude) => {
  // 중복 체크
  const existingUser = await prisma.users_account.findUnique({ where: { username } });
  if (existingUser) {
    console.log(`Duplicate user found: username:${username}`);
    throw new Error('DUPLICATE_USER'); // 커스텀 에러 처리가 좋음
  }

  const hashedPassword = await auth.hashPassword(password);

  const user = await prisma.users_account.create({
    data: {
      username,
      password: hashedPassword,
      // 위치 테이블 동시 생성
      users_location: {
        create: {
          longitude,
          latitude,
        },
      },
    },
    select: {
      user_id: true,
      username: true,
      nickname: true,
    },
  });

  // 토큰 발급
  const token = jwttoken.generateToken({
    userId: user.user_id,
    username: user.username,
    nickname: user.nickname,
  });

  console.log(`User registered: userId:${user.user_id}, username:${username}`);

  return { token };
};

// POST /api/auth/login 로그인 로직
export const authenticateUser = async (username, password) => {
  const user = await prisma.users_account.findUnique({
    where: { username },
    select: {
      user_id: true,
      username: true,
      nickname: true,
      password: true,
    },
  });

  if (!user) {
    console.log(`User not found: username:${username}`);
    return null;
  }

  const isMatch = await auth.comparePassword(password, user.password);
  if (!isMatch) {
    console.log(`Password mismatch for userId: ${user.user_id}, username:${user.username}`);
    return null;
  }

  // 토큰 발급
  const token = jwttoken.generateToken({
    userId: user.user_id,
    username: user.username,
    nickname: user.nickname,
  });
  console.log(`User authenticated: userId:${user.user_id}, username:${user.username}`);

  return { token };
};

// POST /api/auth/ 토큰 검증 및 갱신 로직 (미들웨어에서 이미 검증됨)
export const refreshToken = async (oldToken) => {
  const newToken = jwttoken.generateToken({
    userId: oldToken.userId,
    username: oldToken.username,
    nickname: oldToken.nickname,
  });
  console.log(`Token refreshed for userId:${oldToken.userId}`);

  return { token: newToken };
};

// GET /api/auth/ 유저 목록 (비밀번호 제외)
export const getAllUsers = async () => {
  const users = await prisma.users_account.findMany({
    select: {
      user_id: true,
      username: true,
      nickname: true,
      // password 제외
    },
  });
  console.log(`Users retrieved: count:${users.length}`);

  return users.map((u) => ({
    userId: u.user_id,
    username: u.username,
    nickname: u.nickname,
  }));
};
