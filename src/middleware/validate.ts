import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../errors/index.ts';
import logger from '../config/logger.ts';

export const validateBody =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    logger.debug({ result: result.success }, 'Body validation');

    if (!result.success) {
      throw new ValidationError(
        '유효성 검사 실패',
        result.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }

    req.body = result.data;
    next();
  };

export const validateQuery =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    logger.debug({ result: result.success }, 'Query validation');

    if (!result.success) {
      throw new ValidationError(
        '유효성 검사 실패',
        result.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }

    req.validatedQuery = result.data as Record<string, unknown>;
    next();
  };

export const validateParams =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    logger.debug({ result: result.success }, 'Params validation');

    if (!result.success) {
      throw new ValidationError(
        '유효성 검사 실패',
        result.error.flatten().fieldErrors as Record<string, string[]>,
      );
    }

    req.validatedParams = result.data as Record<string, unknown>;
    next();
  };
