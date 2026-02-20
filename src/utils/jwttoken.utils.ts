import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types/index.ts';

function generateToken(user: {
  userId: string;
  username: string;
  nickname?: string | null;
}): string {
  const payload = {
    userId: user.userId,
    username: user.username,
    nickname: user.nickname,
  };

  const secretKey = process.env.JWT_SECRET_KEY!;
  const options: jwt.SignOptions = { expiresIn: '3h' };

  return jwt.sign(payload, secretKey, options);
}

export default { generateToken };
