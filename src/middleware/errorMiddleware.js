const { fail } = require("../utils/apiResponse");

/**
 * Central error handler. Every controller uses express-async-errors,
 * so any thrown/rejected error lands here — no raw stack traces
 * or exceptions ever reach the Flutter client.
 */
function errorHandler(err, req, res, next) {
  console.error("🔥 Error:", err.message);
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }

  const statusCode = err.statusCode || 500;
  const code = err.code || "SERVER_ERROR";

  // Friendly, user-safe messages for common failure classes.
  const friendlyMessages = {
    AI_TIMEOUT: "The AI service took too long to respond. Please try again.",
    AI_UNAVAILABLE: "AI service is temporarily unavailable. Please try again.",
    AI_RATE_LIMITED: "Too many requests right now. Please wait a moment and try again.",
    AI_INVALID_RESPONSE: "The AI returned an unexpected response. Please try again.",
    UNSUPPORTED_FILE_TYPE: err.message,
    VALIDATION_ERROR: err.message,
  };

  const message =
    friendlyMessages[code] || err.message || "Something went wrong on our end.";

  return fail(res, statusCode, message, code);
}

function notFound(req, res) {
  return fail(res, 404, `Route not found: ${req.method} ${req.originalUrl}`, "NOT_FOUND");
}

module.exports = { errorHandler, notFound };
