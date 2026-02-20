export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly data: unknown;
  public readonly isOperational: boolean;

  constructor(code: string, message: string, statusCode = 500, data: unknown = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.data = data;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static fromCode(
    errorCode: { code: string; message: string; status: number },
    data: unknown = null,
  ): AppError {
    return new AppError(errorCode.code, errorCode.message, errorCode.status, data);
  }

  toJSON(): Record<string, unknown> {
    const json: Record<string, unknown> = {
      code: this.code,
      message: this.message,
    };
    if (this.data) json.data = this.data;
    return json;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, errors: Record<string, string[]> = {}) {
    super('VALIDATION_ERROR', message, 400, errors);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super('NOT_FOUND', `${resource}을(를) 찾을 수 없습니다`, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = '인증이 필요합니다') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '권한이 없습니다') {
    super('FORBIDDEN', message, 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message = '이미 존재하는 리소스입니다') {
    super('CONFLICT', message, 409);
    this.name = 'ConflictError';
  }
}

export default AppError;
