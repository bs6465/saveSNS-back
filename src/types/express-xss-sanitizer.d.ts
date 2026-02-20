declare module 'express-xss-sanitizer' {
  import { RequestHandler } from 'express';

  interface XssSanitizerOptions {
    allowedKeys?: string[];
    allowedTags?: string[];
  }

  export function xss(options?: XssSanitizerOptions): RequestHandler;
}
