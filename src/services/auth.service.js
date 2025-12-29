import { prisma } from '../prismaClient.js';
import auth from '../utils/password.utils.js';
import jwttoken from '../utils/jwttoken.utils.js';

/* 
로그인, 회원가입 로직
*/

// POST /api/auth/register 회원가입 로직
export const registerUser = async (username, password, longitude, latitude) => {
  // 중복 체크
  const existingUser = await prisma.userAccount.findUnique({ where: { username } });
  if (existingUser) {
    console.log(`Duplicate user found: username:${username}`);
    throw new Error('DUPLICATE_USER'); // 커스텀 에러 처리가 좋음
  }

  const hashedPassword = await auth.hashPassword(password);

  const user = await prisma.userAccount.create({
    data: {
      username,
      password: hashedPassword,
      // 위치 테이블 동시 생성
      location: {
        create: {
          longitude,
          latitude,
        },
      },
    },
    select: {
      userId: true,
      username: true,
      nickname: true,
    },
  });

  // 토큰 발급
  const token = jwttoken.generateToken({
    userId: user.userId,
    username: user.username,
    nickname: user.nickname,
  });

  console.log(`User registered: userId:${user.userId}, username:${username}`);

  return { token };
};

// POST /api/auth/login 로그인 로직
export const authenticateUser = async (username, password) => {
  const user = await prisma.userAccount.findUnique({
    where: { username },
    select: {
      userId: true,
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
    console.log(`Password mismatch for userId: ${user.userId}, username:${user.username}`);
    return null;
  }

  // 토큰 발급
  const token = jwttoken.generateToken({
    userId: user.userId,
    username: user.username,
    nickname: user.nickname,
  });
  console.log(`User authenticated: userId:${user.userId}, username:${user.username}`);

  return { token };
};

// GET /api/auth/ 유저 목록 (비밀번호 제외)
export const getAllUsers = async () => {
  const users = await prisma.userAccount.findMany({
    select: {
      userId: true,
      username: true,
      nickname: true,
      // password 제외
    },
  });
  console.log(`Users retrieved: count:${users.length}`);

  return users;
};

// GET /api/auth/me 내 정보 가져오기
export const getUserById = async (userId) => {
  const user = await prisma.userAccount.findUnique({
    where: { userId },
    select: {
      userId: true,
      username: true,
      nickname: true,
    },
  });
  console.log(`User retrieved: userId:${user.userId}, username:${user.username}`);

  return user;
};
