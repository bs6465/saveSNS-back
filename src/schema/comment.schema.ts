import { z } from 'zod';
import { VALIDATION } from '../config/constants.ts';

/**
 * Comment validation schemas
 */

export const createCommentSchema = z.object({
  contents: z
    .string()
    .min(VALIDATION.comment.minLength, '댓글 내용을 입력해주세요')
    .max(
      VALIDATION.comment.maxLength,
      `댓글은 ${VALIDATION.comment.maxLength}자 이하로 작성해주세요`,
    ),
  parentId: z.string().uuid('유효하지 않은 상위 댓글 ID입니다').optional().nullable(),
});

export const updateCommentSchema = z.object({
  contents: z
    .string()
    .min(VALIDATION.comment.minLength, '댓글 내용을 입력해주세요')
    .max(
      VALIDATION.comment.maxLength,
      `댓글은 ${VALIDATION.comment.maxLength}자 이하로 작성해주세요`,
    ),
});

export const commentIdParamSchema = z.object({
  commentId: z.string().uuid('유효하지 않은 댓글 ID입니다'),
});

export const postIdParamSchema = z.object({
  postId: z.string().uuid('유효하지 않은 게시글 ID입니다'),
});

export default {
  createCommentSchema,
  updateCommentSchema,
  commentIdParamSchema,
  postIdParamSchema,
};
