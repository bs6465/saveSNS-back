import { Server as SocketIOServer, type Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types/index.ts';
import logger from '../config/logger.ts';
import { CORS_CONFIG } from '../config/constants.ts';

let io: SocketIOServer | null = null;

export function initSocketIO(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => {
        if (
          !origin ||
          CORS_CONFIG.allowedOrigins.includes(origin) ||
          origin.match(/^https?:\/\/localhost(:\d+)?$/)
        ) {
          callback(null, true);
        } else {
          callback(new Error('CORS blocked'));
        }
      },
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  // JWT 인증 미들웨어
  io.use((socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      return next(new Error('인증 토큰이 필요합니다'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!) as JwtPayload;
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error('유효하지 않은 토큰입니다'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const { userId } = socket.data.user as JwtPayload;
    logger.info({ userId, socketId: socket.id }, 'Socket connected');

    // 사용자별 room 조인
    socket.join(`user:${userId}`);

    // 위치 기반 room 조인
    socket.on('join:location', (data: { latitude: number; longitude: number }) => {
      // 위치 기반 격자 계산 (간단히 소수점 2자리로 클러스터링)
      const gridKey = `loc:${data.latitude.toFixed(2)},${data.longitude.toFixed(2)}`;
      socket.join(gridKey);
      socket.data.locationRoom = gridKey;
      logger.debug({ userId, gridKey }, 'Joined location room');
    });

    // 투표 room 조인
    socket.on('join:poll', (pollId: string) => {
      socket.join(`poll:${pollId}`);
    });

    socket.on('leave:poll', (pollId: string) => {
      socket.leave(`poll:${pollId}`);
    });

    socket.on('disconnect', () => {
      logger.info({ userId, socketId: socket.id }, 'Socket disconnected');
    });
  });

  logger.info('Socket.IO initialized');
  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

// 유틸리티: 특정 사용자에게 이벤트 전송
export function emitToUser(userId: string, event: string, data: unknown): void {
  io?.to(`user:${userId}`).emit(event, data);
}

// 유틸리티: 위치 기반 room에 이벤트 전송
export function emitToLocation(
  latitude: number,
  longitude: number,
  event: string,
  data: unknown,
): void {
  const gridKey = `loc:${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  io?.to(gridKey).emit(event, data);
}

// 유틸리티: 투표 room에 이벤트 전송
export function emitToPoll(pollId: string, event: string, data: unknown): void {
  io?.to(`poll:${pollId}`).emit(event, data);
}
