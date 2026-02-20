import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { successResponse, errorResponse } from '../../../src/utils/response.utils.js';

describe('response.utils', () => {
  let res;

  beforeEach(() => {
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('successResponse', () => {
    it('기본 성공 응답을 반환한다', () => {
      successResponse(res, 'Success', { id: 1 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 200,
        success: true,
        message: 'Success',
        data: { id: 1 },
      });
    });

    it('커스텀 상태코드를 사용할 수 있다', () => {
      successResponse(res, '생성됨', { id: 1 }, 201);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 201,
        success: true,
        message: '생성됨',
        data: { id: 1 },
      });
    });

    it('데이터 없이도 동작한다', () => {
      successResponse(res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 200,
        success: true,
        message: 'Success',
        data: undefined,
      });
    });
  });

  describe('errorResponse', () => {
    it('기본 에러 응답을 반환한다', () => {
      errorResponse(res, '에러 발생');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 500,
        success: false,
        message: '에러 발생',
        data: null,
      });
    });

    it('커스텀 상태코드와 데이터를 사용할 수 있다', () => {
      errorResponse(res, '잘못된 요청', { field: 'username' }, 400);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 400,
        success: false,
        message: '잘못된 요청',
        data: { field: 'username' },
      });
    });

    it('기본값으로 동작한다', () => {
      errorResponse(res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 500,
        success: false,
        message: 'Error',
        data: null,
      });
    });
  });
});
