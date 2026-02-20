import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from '../../../src/schema/auth.schema.js';

describe('auth.schema', () => {
  describe('registerSchema', () => {
    it('유효한 데이터를 통과시킨다', () => {
      const data = { username: 'testuser', password: 'Pass1234', nickname: '테스트' };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('닉네임 없이도 통과시킨다', () => {
      const data = { username: 'testuser', password: 'Pass1234' };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('짧은 사용자명을 거부한다', () => {
      const data = { username: 'ab', password: 'Pass1234' };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('영문자가 없는 비밀번호를 거부한다', () => {
      const data = { username: 'testuser', password: '12345678' };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('숫자가 없는 비밀번호를 거부한다', () => {
      const data = { username: 'testuser', password: 'abcdefgh' };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('짧은 비밀번호를 거부한다', () => {
      const data = { username: 'testuser', password: 'Pa1' };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('특수문자가 포함된 사용자명을 거부한다', () => {
      const data = { username: 'test@user', password: 'Pass1234' };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('너무 긴 사용자명을 거부한다', () => {
      const data = { username: 'a'.repeat(51), password: 'Pass1234' };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('좌표를 포함할 수 있다', () => {
      const data = { username: 'testuser', password: 'Pass1234', longitude: 127.0, latitude: 37.5 };
      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('loginSchema', () => {
    it('유효한 로그인 데이터를 통과시킨다', () => {
      const data = { username: 'testuser', password: '1234' };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('빈 사용자명을 거부한다', () => {
      const data = { username: '', password: '1234' };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('빈 비밀번호를 거부한다', () => {
      const data = { username: 'testuser', password: '' };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('유효한 비밀번호 변경 데이터를 통과시킨다', () => {
      const data = { currentPassword: 'Old12345', newPassword: 'New12345' };
      const result = changePasswordSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('약한 새 비밀번호를 거부한다', () => {
      const data = { currentPassword: 'Old12345', newPassword: '1234' };
      const result = changePasswordSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
