import { xss } from 'express-xss-sanitizer';

interface XssSanitizerOptions {
  skipFields?: string[];
}

export const xssSanitizer = (options: XssSanitizerOptions = {}) => {
  const { skipFields = [] } = options;

  return xss({
    allowedKeys: skipFields,
  });
};
