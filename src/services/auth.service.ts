import { prisma } from '../prismaClient.ts';
import auth from '../utils/password.utils.ts';
import jwttoken from '../utils/jwttoken.utils.ts';
import logger from '../config/logger.ts';

/*
로그인, 회원가입 로직
*/

interface AuthResult {
  token: string;
}

interface UserListItem {
  userId: string;
  username: string;
  nickname: string | null;
}

export const registerUser = async (
  username: string,
  password: string,
  longitude?: number,
  latitude?: number,
): Promise<AuthResult> => {
  const existingUser = await prisma.users_account.findUnique({ where: { username } });
  if (existingUser) {
    logger.warn(`Duplicate user found: username:${username}`);
    throw new Error('DUPLICATE_USER');
  }

  const hashedPassword = await auth.hashPassword(password);

  const user = await prisma.users_account.create({
    data: {
      username,
      password: hashedPassword,
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

  const token = jwttoken.generateToken({
    userId: user.user_id,
    username: user.username,
    nickname: user.nickname,
  });

  logger.info(`User registered: userId:${user.user_id}, username:${username}`);
  return { token };
};

export const authenticateUser = async (
  username: string,
  password: string,
): Promise<AuthResult | null> => {
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
    logger.warn(`User not found: username:${username}`);
    return null;
  }

  if (!user.password) {
    logger.warn(`User has no password: userId:${user.user_id}`);
    return null;
  }

  const isMatch = await auth.comparePassword(password, user.password);
  if (!isMatch) {
    logger.warn(`Password mismatch for userId: ${user.user_id}, username:${user.username}`);
    return null;
  }

  const token = jwttoken.generateToken({
    userId: user.user_id,
    username: user.username,
    nickname: user.nickname,
  });
  logger.info(`User authenticated: userId:${user.user_id}, username:${user.username}`);

  return { token };
};

export const refreshToken = async (oldToken: {
  userId: string;
  username: string;
  nickname: string | null;
}): Promise<AuthResult> => {
  const newToken = jwttoken.generateToken({
    userId: oldToken.userId,
    username: oldToken.username,
    nickname: oldToken.nickname ?? undefined,
  });
  logger.info(`Token refreshed for userId:${oldToken.userId}`);
  return { token: newToken };
};

export const getAllUsers = async (): Promise<UserListItem[]> => {
  const users = await prisma.users_account.findMany({
    select: {
      user_id: true,
      username: true,
      nickname: true,
    },
  });
  logger.info(`Users retrieved: count:${users.length}`);

  return users.map((u) => ({
    userId: u.user_id,
    username: u.username,
    nickname: u.nickname,
  }));
};
