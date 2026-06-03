import { describe, it, expect } from 'vitest';
import {
  createPostSchema,
  getPostsSchema,
  getPostByIdSchema,
  updatePostSchema,
} from '../../../src/schema/post.schema.js';

describe('post.schema', () => {
  describe('createPostSchema', () => {
    it('유효한 데이터를 통과시킨다', () => {
      const data = { contents: '안녕하세요', longitude: 127.0, latitude: 37.5 };
      const result = createPostSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('미디어 URL을 포함할 수 있다', () => {
      const data = {
        contents: '사진 게시글',
        longitude: 127.0,
        latitude: 37.5,
        mediaUrls: ['https://example.com/img.jpg'],
      };
      const result = createPostSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('미디어 파일 메타데이터를 포함할 수 있다', () => {
      const data = {
        contents: '영상 게시글',
        longitude: 127.0,
        latitude: 37.5,
        mediaFiles: [
          {
            link: 'https://example.com/video.mp4',
            thumbnailLink: null,
            type: 'video',
          },
        ],
      };
      const result = createPostSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('잘못된 미디어 타입을 거부한다', () => {
      const data = {
        contents: '잘못된 게시글',
        longitude: 127.0,
        latitude: 37.5,
        mediaFiles: [
          {
            link: 'https://example.com/file.bin',
            type: 'binary',
          },
        ],
      };
      const result = createPostSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('미디어 파일은 최대 5개까지 허용한다', () => {
      const data = {
        contents: '첨부 많은 게시글',
        longitude: 127.0,
        latitude: 37.5,
        mediaFiles: Array.from({ length: 6 }, (_, index) => ({
          link: `https://example.com/${index}.jpg`,
          type: 'image',
        })),
      };
      const result = createPostSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('빈 내용을 거부한다', () => {
      const data = { contents: '', longitude: 127.0, latitude: 37.5 };
      const result = createPostSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('범위 밖 경도를 거부한다', () => {
      const data = { contents: '테스트', longitude: 200, latitude: 37.5 };
      const result = createPostSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('범위 밖 위도를 거부한다', () => {
      const data = { contents: '테스트', longitude: 127.0, latitude: -100 };
      const result = createPostSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('문자열 숫자를 coerce로 변환한다', () => {
      const data = { contents: '테스트', longitude: '127.0', latitude: '37.5' };
      const result = createPostSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data.longitude).toBe(127.0);
    });

    it('mediaUrls 기본값이 빈 배열이다', () => {
      const data = { contents: '테스트', longitude: 127.0, latitude: 37.5 };
      const result = createPostSchema.safeParse(data);
      expect(result.data.mediaUrls).toEqual([]);
      expect(result.data.mediaFiles).toEqual([]);
    });
  });

  describe('getPostsSchema', () => {
    it('유효한 쿼리를 통과시킨다', () => {
      const data = { longitude: 127.0, latitude: 37.5, rangeMeters: 5000 };
      const result = getPostsSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data.limit).toBe(20); // 기본값
      expect(result.data.sortBy).toBe('recent'); // 기본값
    });

    it('범위 밖 rangeMeters를 거부한다', () => {
      const data = { longitude: 127.0, latitude: 37.5, rangeMeters: 50 };
      const result = getPostsSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('유효한 sortBy를 허용한다', () => {
      const data = { longitude: 127.0, latitude: 37.5, rangeMeters: 5000, sortBy: 'distance' };
      const result = getPostsSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('잘못된 sortBy를 거부한다', () => {
      const data = { longitude: 127.0, latitude: 37.5, rangeMeters: 5000, sortBy: 'invalid' };
      const result = getPostsSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('getPostByIdSchema', () => {
    it('유효한 postId를 통과시킨다', () => {
      const data = { postId: 'some-valid-id' };
      const result = getPostByIdSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('빈 postId를 거부한다', () => {
      const data = { postId: '' };
      const result = getPostByIdSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('updatePostSchema', () => {
    it('유효한 수정 데이터를 통과시킨다', () => {
      const data = { contents: '수정된 내용' };
      const result = updatePostSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('빈 내용을 거부한다', () => {
      const data = { contents: '' };
      const result = updatePostSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
