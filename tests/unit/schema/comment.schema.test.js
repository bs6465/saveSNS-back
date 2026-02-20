import { describe, it, expect } from 'vitest';
import {
  createCommentSchema,
  updateCommentSchema,
  commentIdParamSchema,
  postIdParamSchema,
} from '../../../src/schema/comment.schema.js';

describe('comment.schema', () => {
  describe('createCommentSchema', () => {
    it('유효한 댓글을 통과시킨다', () => {
      const data = { contents: '좋은 글이네요!' };
      const result = createCommentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('parentId를 포함할 수 있다 (대댓글)', () => {
      const data = { contents: '대댓글입니다', parentId: '550e8400-e29b-41d4-a716-446655440000' };
      const result = createCommentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('null parentId를 허용한다', () => {
      const data = { contents: '댓글', parentId: null };
      const result = createCommentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('빈 내용을 거부한다', () => {
      const data = { contents: '' };
      const result = createCommentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('500자 초과 댓글을 거부한다', () => {
      const data = { contents: 'a'.repeat(501) };
      const result = createCommentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('잘못된 UUID parentId를 거부한다', () => {
      const data = { contents: '댓글', parentId: 'not-a-uuid' };
      const result = createCommentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('updateCommentSchema', () => {
    it('유효한 수정을 통과시킨다', () => {
      const data = { contents: '수정된 댓글' };
      const result = updateCommentSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('빈 내용을 거부한다', () => {
      const data = { contents: '' };
      const result = updateCommentSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('commentIdParamSchema', () => {
    it('유효한 UUID를 통과시킨다', () => {
      const data = { commentId: '550e8400-e29b-41d4-a716-446655440000' };
      const result = commentIdParamSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('잘못된 UUID를 거부한다', () => {
      const data = { commentId: 'invalid' };
      const result = commentIdParamSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('postIdParamSchema', () => {
    it('유효한 UUID를 통과시킨다', () => {
      const data = { postId: '550e8400-e29b-41d4-a716-446655440000' };
      const result = postIdParamSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('잘못된 UUID를 거부한다', () => {
      const data = { postId: 'invalid' };
      const result = postIdParamSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
