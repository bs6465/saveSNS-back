import type { Request, Response, NextFunction } from 'express';

// ─── Express Request 전역 타입 보강 ─────────────

export interface JwtPayload {
  userId: string;
  username: string;
  nickname: string;
  iat?: number;
  exp?: number;
}

// Express Request에 user, validatedQuery, validatedParams 속성 추가
// authMiddleware, validate 미들웨어에서 설정하며, 컨트롤러에서 캐스팅 없이 접근 가능
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      validatedQuery?: Record<string, unknown>;
      validatedParams?: Record<string, unknown>;
    }
  }
}

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void | Response>;

// ─── Error 타입 ─────────────────────────────────

export interface ErrorCodeDef {
  code: string;
  message: string;
  status: number;
}

// ─── 공통 응답 ──────────────────────────────────

export interface ApiResponse<T = unknown> {
  status: number;
  success: boolean;
  message: string;
  data: T;
}

// ─── Config 타입 ────────────────────────────────

export interface AppConfig {
  port: number | string;
  nodeEnv: string;
}

// ─── Urgency 타입 ───────────────────────────────

export interface UrgencyAnalysis {
  score: number;
  level: 'urgent' | 'caution' | 'normal';
  category: string | null;
  matchedKeywords: string[];
  confidence: number;
}

export interface UrgencyKeywordMap {
  [keyword: string]: number;
}

export interface UrgencyCategory {
  weight: number;
  keywords: UrgencyKeywordMap;
}

export interface UrgencyKeywordsConfig {
  [category: string]: UrgencyCategory;
}

// ─── Shelter 타입 ───────────────────────────────

export type ShelterType = 'civil_defense' | 'earthquake' | 'flood';

// ─── Image 타입 ─────────────────────────────────

export interface ProcessedImage {
  buffer: Buffer;
  contentType: string;
}

// ─── Transformer 타입 ───────────────────────────

export interface UserFromDB {
  user_id: string;
  username: string;
  nickname: string;
  created_at?: Date;
}

export interface PostFromDB {
  post_id: string;
  user_id: string;
  contents: string;
  created_at: Date;
  longitude: number;
  latitude: number;
  users_account?: UserFromDB;
  media_storage?: MediaFromDB[];
}

export interface MediaFromDB {
  media_id: string;
  link: string;
  type: string;
  created_at: Date;
}

// ─── Cache 타입 ──────────────────────────────────

export interface CacheTTL {
  weather: number;
  airQuality: number;
  profile: number;
  posts: number;
  search: number;
}
