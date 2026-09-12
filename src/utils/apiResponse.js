/**
 * Consistent response envelope used across every endpoint so the
 * Flutter app can rely on a single shape: { success, data, error }.
 */
function success(res, data, statusCode = 200, meta = undefined) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}

function fail(res, statusCode, message, code = "ERROR", details = undefined) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}

module.exports = { success, fail };
