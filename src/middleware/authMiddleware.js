const jwt = require("jsonwebtoken");
const { fail } = require("../utils/apiResponse");

/**
 * Verifies the Bearer JWT on protected routes and attaches
 * the decoded user id to req.userId. Never trust a client-supplied
 * user id in the request body — always use req.userId instead.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return fail(res, 401, "Authentication token missing.", "NO_TOKEN");
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return fail(res, 401, "Invalid or expired token.", "INVALID_TOKEN");
  }
}

module.exports = { requireAuth };
