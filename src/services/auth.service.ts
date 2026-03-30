import { prisma } from '../prismaClient.ts';
import jwttoken from '../utils/jwttoken.utils.ts';
import logger from '../config/logger.ts';
import { ConflictError, UnauthorizedError } from '../errors/AppError.ts';

/*
소셜 로그인, 계정 연동 로직
*/

interface AuthResult {
  token: string;
}

interface SocialUserInfo {
  snsId: string;
  email?: string;
  nickname?: string;
}

// ─── Google 토큰 검증 ─────────────────────────────

async function verifyGoogleToken(idToken: string): Promise<SocialUserInfo> {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!res.ok) {
    logger.warn('Google token verification failed');
    throw new UnauthorizedError('유효하지 않은 Google 토큰입니다');
  }

  const payload = (await res.json()) as Record<string, string>;

  // aud(audience)가 우리 앱의 client ID인지 확인
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  if (payload.aud !== clientId) {
    logger.warn({ aud: payload.aud }, 'Google token audience mismatch');
    throw new UnauthorizedError('유효하지 않은 Google 토큰입니다');
  }

  return {
    snsId: payload.sub,
    email: payload.email,
    nickname: payload.name || payload.email?.split('@')[0],
  };
}

// ─── 카카오 토큰 검증 ────────────────────────────

async function verifyKakaoToken(accessToken: string): Promise<SocialUserInfo> {
  const res = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    logger.warn('Kakao token verification failed');
    throw new UnauthorizedError('유효하지 않은 카카오 토큰입니다');
  }

  const data = (await res.json()) as {
    id: number;
    kakao_account?: {
      email?: string;
      profile?: { nickname?: string };
    };
  };

  return {
    snsId: String(data.id),
    email: data.kakao_account?.email,
    nickname: data.kakao_account?.profile?.nickname,
  };
}

// ─── 소셜 토큰 검증 통합 ──────────────────────────

export async function verifySocialToken(
  provider: 'google' | 'kakao',
  token: string,
): Promise<SocialUserInfo> {
  if (provider === 'google') return verifyGoogleToken(token);
  return verifyKakaoToken(token);
}

// ─── 소셜 로그인/회원가입 (find-or-create) ────────

async function findOrCreateUser(provider: string, userInfo: SocialUserInfo): Promise<AuthResult> {
  // 1. 기존 소셜 계정 조회
  const existingAccount = await prisma.user_social_account.findUnique({
    where: {
      provider_sns_id: { provider, sns_id: userInfo.snsId },
    },
    include: { users_account: true },
  });

  if (existingAccount) {
    // 기존 유저 → JWT 발급
    const user = existingAccount.users_account;
    const token = jwttoken.generateToken({
      userId: user.user_id,
      nickname: user.nickname,
    });
    logger.info(`Social login: userId:${user.user_id}, provider:${provider}`);
    return { token };
  }

  // 2. 신규 유저 생성 + 소셜 계정 + 위치 정보
  const newUser = await prisma.users_account.create({
    data: {
      nickname: userInfo.nickname ?? null,
      users_location: { create: {} },
      social_accounts: {
        create: {
          provider,
          sns_id: userInfo.snsId,
          email: userInfo.email ?? null,
          nickname: userInfo.nickname ?? null,
        },
      },
    },
    select: { user_id: true, nickname: true },
  });

  const token = jwttoken.generateToken({
    userId: newUser.user_id,
    nickname: newUser.nickname,
  });
  logger.info(`Social register: userId:${newUser.user_id}, provider:${provider}`);
  return { token };
}

// ─── Public API ────────────────────────────────

export const authenticateWithGoogle = async (idToken: string): Promise<AuthResult> => {
  const userInfo = await verifyGoogleToken(idToken);
  return findOrCreateUser('google', userInfo);
};

export const authenticateWithKakao = async (accessToken: string): Promise<AuthResult> => {
  const userInfo = await verifyKakaoToken(accessToken);
  return findOrCreateUser('kakao', userInfo);
};

export const refreshToken = async (oldToken: {
  userId: string;
  nickname: string | null;
}): Promise<AuthResult> => {
  const newToken = jwttoken.generateToken({
    userId: oldToken.userId,
    nickname: oldToken.nickname ?? undefined,
  });
  logger.info(`Token refreshed for userId:${oldToken.userId}`);
  return { token: newToken };
};

export const getAllUsers = async () => {
  const users = await prisma.users_account.findMany({
    select: {
      user_id: true,
      nickname: true,
      social_accounts: {
        select: { provider: true },
      },
    },
  });
  logger.info(`Users retrieved: count:${users.length}`);

  return users.map((u) => ({
    userId: u.user_id,
    nickname: u.nickname,
    providers: u.social_accounts.map((sa) => sa.provider),
  }));
};

// ─── 계정 연동 ──────────────────────────────────

export const linkSocialAccount = async (
  userId: string,
  provider: 'google' | 'kakao',
  token: string,
): Promise<void> => {
  const userInfo = await verifySocialToken(provider, token);

  // 이미 다른 유저에 연동된 소셜 계정인지 확인
  const existing = await prisma.user_social_account.findUnique({
    where: {
      provider_sns_id: { provider, sns_id: userInfo.snsId },
    },
  });

  if (existing) {
    if (existing.user_id === userId) {
      throw new ConflictError('이미 연동된 소셜 계정입니다');
    }
    throw new ConflictError('해당 소셜 계정은 다른 사용자에게 이미 연동되어 있습니다');
  }

  await prisma.user_social_account.create({
    data: {
      user_id: userId,
      provider,
      sns_id: userInfo.snsId,
      email: userInfo.email ?? null,
      nickname: userInfo.nickname ?? null,
    },
  });

  logger.info(`Social account linked: userId:${userId}, provider:${provider}`);
};

export const unlinkSocialAccount = async (userId: string, provider: string): Promise<void> => {
  // 최소 1개 소셜 계정은 유지해야 함
  const accountCount = await prisma.user_social_account.count({
    where: { user_id: userId },
  });

  if (accountCount <= 1) {
    throw new ConflictError('최소 1개의 소셜 계정은 유지해야 합니다');
  }

  await prisma.user_social_account.deleteMany({
    where: { user_id: userId, provider },
  });

  logger.info(`Social account unlinked: userId:${userId}, provider:${provider}`);
};

export const getLinkedAccounts = async (userId: string) => {
  return prisma.user_social_account.findMany({
    where: { user_id: userId },
    select: {
      provider: true,
      email: true,
      nickname: true,
      created_at: true,
    },
  });
};
