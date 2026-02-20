import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import logger from '../config/logger.ts';

export const validateBody =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void | Response => {
    const result = schema.safeParse(req.body);
    logger.debug({ result: result.success }, 'Body validation');

    if (!result.success) {
      return res.status(400).json({
        status: 400,
        message: '유효성 검사 실패',
        errors: result.error.flatten().fieldErrors,
      });
    }

    req.body = result.data;
    next();
  };

export const validateQuery =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void | Response => {
    const result = schema.safeParse(req.query);
    logger.debug({ result: result.success }, 'Query validation');

    if (!result.success) {
      return res.status(400).json({
        status: 400,
        message: '유효성 검사 실패',
        errors: result.error.flatten().fieldErrors,
      });
    }

    (req as unknown as { validatedQuery: unknown }).validatedQuery = result.data;
    next();
  };

export const validateParams =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void | Response => {
    const result = schema.safeParse(req.params);
    logger.debug({ result: result.success }, 'Params validation');

    if (!result.success) {
      return res.status(400).json({
        status: 400,
        message: '유효성 검사 실패',
        errors: result.error.flatten().fieldErrors,
      });
    }

    (req as unknown as { validatedParams: unknown }).validatedParams = result.data;
    next();
  };
