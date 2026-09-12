/**
 * Wraps an async controller so thrown errors / rejected promises
 * are forwarded to Express's error handler instead of crashing
 * the process or hanging the request.
 * (express-async-errors also covers this globally, but this keeps
 * intent explicit in each route file.)
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = asyncHandler;
