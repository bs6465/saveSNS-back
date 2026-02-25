import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../errors/AppError.ts';
import type { JwtPayload } from '../types/index.ts'; // module augmentation 활성화

const verifyTokenAsync = (token: string, secret: string): Promise<JwtPayload> =>
  new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded as JwtPayload);
    });
  });

export async function verifyToken(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('인증 토큰이 필요합니다');
    }

    const decoded = await verifyTokenAsync(token, process.env.JWT_SECRET_KEY!);
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return next(err);
    }
    if ((err as Error).name === 'TokenExpiredError') {
      return next(new UnauthorizedError('토큰이 만료되었습니다'));
    }
    return next(new UnauthorizedError('유효하지 않은 토큰입니다'));
  }
}
