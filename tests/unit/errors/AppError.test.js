import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from '../../../src/errors/AppError.js';

describe('AppError', () => {
  it('올바른 속성을 가진다', () => {
    const error = new AppError('TEST_ERROR', '테스트 에러', 400, { field: 'test' });
    expect(error.message).toBe('테스트 에러');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.data).toEqual({ field: 'test' });
    expect(error.isOperational).toBe(true);
    expect(error).toBeInstanceOf(Error);
  });

  it('기본 상태코드는 500이다', () => {
    const error = new AppError('ERR', '에러');
    expect(error.statusCode).toBe(500);
  });

  it('fromCode로 ErrorCode 객체에서 생성할 수 있다', () => {
    const errorCode = { code: 'NOT_FOUND', message: '찾을 수 없음', status: 404 };
    const error = AppError.fromCode(errorCode);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.statusCode).toBe(404);
  });

  it('toJSON이 올바른 형식을 반환한다', () => {
    const error = new AppError('ERR', '에러', 400, { detail: 'info' });
    const json = error.toJSON();
    expect(json).toEqual({ code: 'ERR', message: '에러', data: { detail: 'info' } });
  });

  it('toJSON에서 data가 없으면 생략한다', () => {
    const error = new AppError('ERR', '에러');
    const json = error.toJSON();
    expect(json).toEqual({ code: 'ERR', message: '에러' });
  });
});

describe('ValidationError', () => {
  it('400 상태코드를 가진다', () => {
    const error = new ValidationError('검증 실패', { field: '필수' });
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.name).toBe('ValidationError');
  });
});

describe('NotFoundError', () => {
  it('404 상태코드를 가진다', () => {
    const error = new NotFoundError('게시글');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('게시글을(를) 찾을 수 없습니다');
  });

  it('기본 리소스명을 가진다', () => {
    const error = new NotFoundError();
    expect(error.message).toBe('Resource을(를) 찾을 수 없습니다');
  });
});

describe('UnauthorizedError', () => {
  it('401 상태코드를 가진다', () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('인증이 필요합니다');
  });
});

describe('ForbiddenError', () => {
  it('403 상태코드를 가진다', () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('권한이 없습니다');
  });
});

describe('ConflictError', () => {
  it('409 상태코드를 가진다', () => {
    const error = new ConflictError('이미 존재');
    expect(error.statusCode).toBe(409);
    expect(error.message).toBe('이미 존재');
  });
});
