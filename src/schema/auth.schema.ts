import { z } from 'zod';
import { VALIDATION } from '../config/constants.ts';

/*
  회원가입, 로그인, 토큰 검증 스키마
*/

const passwordSchema = z
  .string()
  .min(
    VALIDATION.password.minLength,
    `비밀번호는 최소 ${VALIDATION.password.minLength}자 이상이어야 합니다.`,
  )
  .regex(/[A-Za-z]/, '비밀번호에 영문자를 포함해야 합니다.')
  .regex(/[0-9]/, '비밀번호에 숫자를 포함해야 합니다.');

const usernameSchema = z
  .string()
  .min(
    VALIDATION.username.minLength,
    `사용자명은 최소 ${VALIDATION.username.minLength}자 이상이어야 합니다.`,
  )
  .max(
    VALIDATION.username.maxLength,
    `사용자명은 ${VALIDATION.username.maxLength}자 이하여야 합니다.`,
  )
  .regex(/^[a-zA-Z0-9_]+$/, '사용자명은 영문자, 숫자, 밑줄(_)만 사용할 수 있습니다.');

export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  nickname: z
    .string()
    .min(
      VALIDATION.nickname.minLength,
      `닉네임은 최소 ${VALIDATION.nickname.minLength}자 이상이어야 합니다.`,
    )
    .max(
      VALIDATION.nickname.maxLength,
      `닉네임은 ${VALIDATION.nickname.maxLength}자 이하여야 합니다.`,
    )
    .optional(),
  longitude: z.number().optional(),
  latitude: z.number().optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1, '사용자명을 입력해주세요.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요.'),
  newPassword: passwordSchema,
});

export default {
  registerSchema,
  loginSchema,
  changePasswordSchema,
};
