import { z } from 'zod';
import { VALIDATION } from '../config/constants.js';

/*
  회원가입, 로그인, 토큰 검증 스키마
*/

// 비밀번호 검증 규칙 (보안 강화)
const passwordSchema = z
  .string()
  .min(VALIDATION.password.minLength, `비밀번호는 최소 ${VALIDATION.password.minLength}자 이상이어야 합니다.`)
  .regex(/[A-Za-z]/, '비밀번호에 영문자를 포함해야 합니다.')
  .regex(/[0-9]/, '비밀번호에 숫자를 포함해야 합니다.');

// 사용자명 검증 규칙
const usernameSchema = z
  .string()
  .min(VALIDATION.username.minLength, `사용자명은 최소 ${VALIDATION.username.minLength}자 이상이어야 합니다.`)
  .max(VALIDATION.username.maxLength, `사용자명은 ${VALIDATION.username.maxLength}자 이하여야 합니다.`)
  .regex(/^[a-zA-Z0-9_]+$/, '사용자명은 영문자, 숫자, 밑줄(_)만 사용할 수 있습니다.');

// 회원가입 스키마, validateBody 미들웨어에서 사용
export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  nickname: z
    .string()
    .min(VALIDATION.nickname.minLength, `닉네임은 최소 ${VALIDATION.nickname.minLength}자 이상이어야 합니다.`)
    .max(VALIDATION.nickname.maxLength, `닉네임은 ${VALIDATION.nickname.maxLength}자 이하여야 합니다.`)
    .optional(),
  longitude: z.number().optional(),
  latitude: z.number().optional(),
});

// 로그인 스키마, validateBody 미들웨어에서 사용
// 로그인 시에는 기존 사용자를 위해 덜 엄격한 검증 사용
export const loginSchema = z.object({
  username: z.string().min(1, '사용자명을 입력해주세요.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

// 비밀번호 변경 스키마
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요.'),
  newPassword: passwordSchema,
});

export default {
  registerSchema,
  loginSchema,
  changePasswordSchema,
};
