import { prisma } from '../prismaClient.js';
import auth from '../utils/password.utils.js';
import jwttoken from '../utils/jwttoken.utils.js';

/* 
로그인, 회원가입 로직
*/

// POST /api/auth/register 회원가입 로직
export const registerUser = async (username, password) => {
  // 중복 체크
  const existingUser = await prisma.user.findUnique({ where: { username } });
  if (existingUser) {
    throw new Error('DUPLICATE_USER'); // 커스텀 에러 처리가 좋음
  }

  const hashedPassword = await auth.hashPassword(password);

  const user = await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
    },
  });

  return { userId: user.userId };
};

// POST /api/auth/login 로그인 로직
export const authenticateUser = async (username, password) => {
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) return null;

  const isMatch = await auth.comparePassword(password, user.password);
  if (!isMatch) return null;

  // 토큰 발급까지 여기서 수행하거나, 컨트롤러에서 수행할 수 있음
  const token = jwttoken.generateToken({
    userId: user.userId,
    username: user.username,
    nickname: user.nickname,
  });

  return { token };
};

// GET /api/auth/ 유저 목록 (비밀번호 제외)
export const getAllUsers = async () => {
  const users = await prisma.user.findMany({
    select: {
      userId: true,
      username: true,
      nickname: true,
      // password 제외
    },
  });
  return users;
};

// GET /api/auth/me 내 정보 가져오기
export const getUserById = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { userId },
    select: {
      userId: true,
      username: true,
      nickname: true,
    },
  });
  return user;
};