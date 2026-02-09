/**
 * Async handler wrapper for Express route handlers
 * Automatically catches errors and passes them to the error handling middleware
 * Eliminates the need for try-catch blocks in every controller
 */

/**
 * Wraps an async function to handle errors automatically
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Express middleware function
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next); // 에러 발생 시 next()로 전달
};

export default asyncHandler;
