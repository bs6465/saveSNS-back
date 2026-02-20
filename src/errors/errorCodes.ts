import type { ErrorCodeDef } from '../types/index.ts';
import { HTTP_STATUS } from '../config/constants.ts';

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    message: '아이디 또는 비밀번호가 잘못되었습니다',
    status: HTTP_STATUS.UNAUTHORIZED,
  },
  TOKEN_EXPIRED: {
    code: 'TOKEN_EXPIRED',
    message: '토큰이 만료되었습니다',
    status: HTTP_STATUS.UNAUTHORIZED,
  },
  TOKEN_INVALID: {
    code: 'TOKEN_INVALID',
    message: '유효하지 않은 토큰입니다',
    status: HTTP_STATUS.UNAUTHORIZED,
  },
  TOKEN_MISSING: {
    code: 'TOKEN_MISSING',
    message: '인증 토큰이 필요합니다',
    status: HTTP_STATUS.UNAUTHORIZED,
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: '인증이 필요합니다',
    status: HTTP_STATUS.UNAUTHORIZED,
  },
  FORBIDDEN: { code: 'FORBIDDEN', message: '권한이 없습니다', status: HTTP_STATUS.FORBIDDEN },
} as const satisfies Record<string, ErrorCodeDef>;

export const USER_ERRORS = {
  DUPLICATE_USER: {
    code: 'DUPLICATE_USER',
    message: '이미 존재하는 사용자입니다',
    status: HTTP_STATUS.CONFLICT,
  },
  DUPLICATE_NICKNAME: {
    code: 'DUPLICATE_NICKNAME',
    message: '이미 사용 중인 닉네임입니다',
    status: HTTP_STATUS.CONFLICT,
  },
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    message: '사용자를 찾을 수 없습니다',
    status: HTTP_STATUS.NOT_FOUND,
  },
  INVALID_PASSWORD: {
    code: 'INVALID_PASSWORD',
    message: '비밀번호가 올바르지 않습니다',
    status: HTTP_STATUS.BAD_REQUEST,
  },
} as const satisfies Record<string, ErrorCodeDef>;

export const POST_ERRORS = {
  POST_NOT_FOUND: {
    code: 'POST_NOT_FOUND',
    message: '게시글을 찾을 수 없습니다',
    status: HTTP_STATUS.NOT_FOUND,
  },
  POST_CREATE_FAILED: {
    code: 'POST_CREATE_FAILED',
    message: '게시글 작성에 실패했습니다',
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  },
  POST_UPDATE_FAILED: {
    code: 'POST_UPDATE_FAILED',
    message: '게시글 수정에 실패했습니다',
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  },
  POST_DELETE_FAILED: {
    code: 'POST_DELETE_FAILED',
    message: '게시글 삭제에 실패했습니다',
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  },
  NOT_POST_OWNER: {
    code: 'NOT_POST_OWNER',
    message: '게시글 작성자만 수정/삭제할 수 있습니다',
    status: HTTP_STATUS.FORBIDDEN,
  },
} as const satisfies Record<string, ErrorCodeDef>;

export const COMMENT_ERRORS = {
  COMMENT_NOT_FOUND: {
    code: 'COMMENT_NOT_FOUND',
    message: '댓글을 찾을 수 없습니다',
    status: HTTP_STATUS.NOT_FOUND,
  },
  COMMENT_CREATE_FAILED: {
    code: 'COMMENT_CREATE_FAILED',
    message: '댓글 작성에 실패했습니다',
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  },
  NOT_COMMENT_OWNER: {
    code: 'NOT_COMMENT_OWNER',
    message: '댓글 작성자만 수정/삭제할 수 있습니다',
    status: HTTP_STATUS.FORBIDDEN,
  },
  PARENT_COMMENT_NOT_FOUND: {
    code: 'PARENT_COMMENT_NOT_FOUND',
    message: '상위 댓글을 찾을 수 없습니다',
    status: HTTP_STATUS.NOT_FOUND,
  },
} as const satisfies Record<string, ErrorCodeDef>;

export const LIKE_ERRORS = {
  ALREADY_LIKED: {
    code: 'ALREADY_LIKED',
    message: '이미 좋아요한 게시글입니다',
    status: HTTP_STATUS.CONFLICT,
  },
  NOT_LIKED: {
    code: 'NOT_LIKED',
    message: '좋아요하지 않은 게시글입니다',
    status: HTTP_STATUS.BAD_REQUEST,
  },
} as const satisfies Record<string, ErrorCodeDef>;

export const MEDIA_ERRORS = {
  MEDIA_NOT_FOUND: {
    code: 'MEDIA_NOT_FOUND',
    message: '미디어를 찾을 수 없습니다',
    status: HTTP_STATUS.NOT_FOUND,
  },
  MEDIA_UPLOAD_FAILED: {
    code: 'MEDIA_UPLOAD_FAILED',
    message: '미디어 업로드에 실패했습니다',
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  },
  INVALID_FILE_TYPE: {
    code: 'INVALID_FILE_TYPE',
    message: '지원하지 않는 파일 형식입니다',
    status: HTTP_STATUS.BAD_REQUEST,
  },
  FILE_TOO_LARGE: {
    code: 'FILE_TOO_LARGE',
    message: '파일 크기가 너무 큽니다',
    status: HTTP_STATUS.BAD_REQUEST,
  },
} as const satisfies Record<string, ErrorCodeDef>;

export const LOCATION_ERRORS = {
  INVALID_COORDINATES: {
    code: 'INVALID_COORDINATES',
    message: '유효하지 않은 좌표입니다',
    status: HTTP_STATUS.BAD_REQUEST,
  },
  LOCATION_NOT_SET: {
    code: 'LOCATION_NOT_SET',
    message: '위치 정보가 설정되지 않았습니다',
    status: HTTP_STATUS.BAD_REQUEST,
  },
} as const satisfies Record<string, ErrorCodeDef>;

export const NOTIFICATION_ERRORS = {
  NOTIFICATION_NOT_FOUND: {
    code: 'NOTIFICATION_NOT_FOUND',
    message: '알림을 찾을 수 없습니다',
    status: HTTP_STATUS.NOT_FOUND,
  },
} as const satisfies Record<string, ErrorCodeDef>;

export const VALIDATION_ERRORS = {
  VALIDATION_FAILED: {
    code: 'VALIDATION_FAILED',
    message: '유효성 검사 실패',
    status: HTTP_STATUS.BAD_REQUEST,
  },
  MISSING_REQUIRED_FIELD: {
    code: 'MISSING_REQUIRED_FIELD',
    message: '필수 필드가 누락되었습니다',
    status: HTTP_STATUS.BAD_REQUEST,
  },
} as const satisfies Record<string, ErrorCodeDef>;

export const SERVER_ERRORS = {
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    message: '서버 오류가 발생했습니다',
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  },
  DATABASE_ERROR: {
    code: 'DATABASE_ERROR',
    message: '데이터베이스 오류가 발생했습니다',
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  },
  EXTERNAL_SERVICE_ERROR: {
    code: 'EXTERNAL_SERVICE_ERROR',
    message: '외부 서비스 오류가 발생했습니다',
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  },
} as const satisfies Record<string, ErrorCodeDef>;

export const ErrorCodes = {
  ...AUTH_ERRORS,
  ...USER_ERRORS,
  ...POST_ERRORS,
  ...COMMENT_ERRORS,
  ...LIKE_ERRORS,
  ...MEDIA_ERRORS,
  ...LOCATION_ERRORS,
  ...NOTIFICATION_ERRORS,
  ...VALIDATION_ERRORS,
  ...SERVER_ERRORS,
} as const;

export default ErrorCodes;
