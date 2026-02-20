import { describe, it, expect } from 'vitest';
import {
  mapFields,
  userTransformer,
  postTransformer,
  mediaTransformer,
  commentTransformer,
  notificationTransformer,
  selectFields,
} from '../../../src/utils/transformer.utils.js';

describe('transformer.utils', () => {
  describe('mapFields', () => {
    it('필드를 올바르게 매핑한다', () => {
      const obj = { first_name: 'John', last_name: 'Doe', age: 30 };
      const fieldMap = { first_name: 'firstName', last_name: 'lastName' };
      expect(mapFields(obj, fieldMap)).toEqual({ firstName: 'John', lastName: 'Doe' });
    });

    it('null 입력에 대해 null을 반환한다', () => {
      expect(mapFields(null, {})).toBeNull();
    });

    it('존재하지 않는 소스 키는 무시한다', () => {
      const obj = { a: 1 };
      const fieldMap = { a: 'x', b: 'y' };
      expect(mapFields(obj, fieldMap)).toEqual({ x: 1 });
    });
  });

  describe('userTransformer.fromDB', () => {
    it('DB 사용자를 API 형식으로 변환한다', () => {
      const dbUser = { user_id: 'uid-1', username: 'testuser', nickname: '테스트' };
      expect(userTransformer.fromDB(dbUser)).toEqual({
        userId: 'uid-1',
        username: 'testuser',
        nickname: '테스트',
      });
    });

    it('null 입력에 대해 null을 반환한다', () => {
      expect(userTransformer.fromDB(null)).toBeNull();
    });
  });

  describe('userTransformer.profileFromDB', () => {
    it('프로필 데이터를 올바르게 변환한다', () => {
      const dbUser = {
        user_id: 'uid-1',
        username: 'user',
        nickname: 'nick',
        created_at: '2026-01-01',
      };
      const result = userTransformer.profileFromDB(dbUser);
      expect(result).toEqual({
        userId: 'uid-1',
        username: 'user',
        nickname: 'nick',
        createdAt: '2026-01-01',
      });
    });
  });

  describe('postTransformer.fromDB', () => {
    it('게시글을 올바르게 변환한다', () => {
      const dbPost = {
        post_id: 'pid-1',
        user_id: 'uid-1',
        contents: '내용',
        created_at: '2026-01-01',
        longitude: 127.0,
        latitude: 37.5,
      };
      expect(postTransformer.fromDB(dbPost)).toEqual({
        postId: 'pid-1',
        userId: 'uid-1',
        contents: '내용',
        createdAt: '2026-01-01',
        longitude: 127.0,
        latitude: 37.5,
      });
    });

    it('null 입력에 대해 null을 반환한다', () => {
      expect(postTransformer.fromDB(null)).toBeNull();
    });
  });

  describe('postTransformer.withRelationsFromDB', () => {
    it('관계 데이터를 포함하여 변환한다', () => {
      const dbPost = {
        post_id: 'pid-1',
        contents: '내용',
        created_at: '2026-01-01',
        longitude: 127.0,
        latitude: 37.5,
        users_account: { user_id: 'uid-1', username: 'user', nickname: 'nick' },
        media_storage: [
          { media_id: 'mid-1', link: 'http://img.jpg', type: 'image', created_at: '2026-01-01' },
        ],
      };
      const result = postTransformer.withRelationsFromDB(dbPost);
      expect(result.user).toEqual({ userId: 'uid-1', username: 'user', nickname: 'nick' });
      expect(result.media).toHaveLength(1);
      expect(result.media[0].mediaId).toBe('mid-1');
    });

    it('관계 데이터가 없어도 동작한다', () => {
      const dbPost = {
        post_id: 'pid-1',
        contents: '내용',
        created_at: '2026-01-01',
        longitude: 127.0,
        latitude: 37.5,
      };
      const result = postTransformer.withRelationsFromDB(dbPost);
      expect(result.user).toBeNull();
      expect(result.media).toEqual([]);
    });
  });

  describe('postTransformer.listItemFromDB', () => {
    it('리스트 아이템 형식으로 변환한다', () => {
      const item = {
        post_id: 'pid-1',
        user_id: 'uid-1',
        nickname: 'nick',
        contents: '내용',
        created_at: '2026-01-01',
        distance: 500,
        likeCount: 3,
        commentCount: 2,
        media: [],
      };
      const result = postTransformer.listItemFromDB(item);
      expect(result.postId).toBe('pid-1');
      expect(result.likeCount).toBe(3);
      expect(result.commentCount).toBe(2);
    });

    it('카운트 기본값이 0이다', () => {
      const item = { post_id: 'pid-1', contents: '내용' };
      const result = postTransformer.listItemFromDB(item);
      expect(result.likeCount).toBe(0);
      expect(result.commentCount).toBe(0);
    });
  });

  describe('mediaTransformer.fromDB', () => {
    it('미디어를 올바르게 변환한다', () => {
      const media = {
        media_id: 'mid-1',
        link: 'http://img.jpg',
        type: 'image',
        created_at: '2026-01-01',
      };
      expect(mediaTransformer.fromDB(media)).toEqual({
        mediaId: 'mid-1',
        link: 'http://img.jpg',
        type: 'image',
        createdAt: '2026-01-01',
      });
    });
  });

  describe('commentTransformer.fromDB', () => {
    it('댓글을 올바르게 변환한다', () => {
      const comment = {
        commentId: 'cid-1',
        postId: 'pid-1',
        userId: 'uid-1',
        parentId: null,
        contents: '댓글 내용',
        createdAt: '2026-01-01',
        updatedAt: null,
        user: { user_id: 'uid-1', username: 'user', nickname: 'nick' },
        replies: [],
      };
      const result = commentTransformer.fromDB(comment);
      expect(result.commentId).toBe('cid-1');
      expect(result.user.userId).toBe('uid-1');
      expect(result.replies).toEqual([]);
    });
  });

  describe('selectFields', () => {
    it('올바른 select 구성을 가진다', () => {
      expect(selectFields.user).toHaveProperty('user_id');
      expect(selectFields.user).toHaveProperty('username');
      expect(selectFields.user).toHaveProperty('nickname');
      expect(selectFields.postBasic).toHaveProperty('post_id');
      expect(selectFields.media).toHaveProperty('media_id');
    });
  });
});
