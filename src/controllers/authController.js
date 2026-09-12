const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { success, fail } = require("../utils/apiResponse");
const { sendResetCodeEmail } = require("../utils/sendEmail");

function signToken(userId) {
  return jwt.sign({ sub: userId.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// POST /api/auth/signup
const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return fail(res, 409, "An account with this email already exists.", "EMAIL_TAKEN");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash });

  const token = signToken(user._id);
  return success(res, { user, token }, 201);
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return fail(res, 401, "Invalid email or password.", "INVALID_CREDENTIALS");
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return fail(res, 401, "Invalid email or password.", "INVALID_CREDENTIALS");
  }

  const token = signToken(user._id);
  return success(res, { user, token });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    return fail(res, 404, "User not found.", "USER_NOT_FOUND");
  }
  return success(res, { user });
});

// PUT /api/auth/me
const updateMe = asyncHandler(async (req, res) => {
  const allowedFields = [
    "name",
    "careerGoal",
    "skills",
    "darkModeEnabled",
    "notificationsEnabled",
    "language",
  ];
  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const user = await User.findByIdAndUpdate(req.userId, updates, { new: true });
  return success(res, { user });
});

// POST /api/auth/forgot-password
// Always responds with the same success message whether or not the email
// exists — this prevents leaking which emails are registered.
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    const code = crypto.randomInt(100000, 999999).toString(); // 6-digit code
    const codeHash = await bcrypt.hash(code, 10);
    const expiresMinutes = Number(process.env.RESET_CODE_EXPIRES_MINUTES) || 15;

    user.resetCodeHash = codeHash;
    user.resetCodeExpires = new Date(Date.now() + expiresMinutes * 60 * 1000);
    await user.save();

    await sendResetCodeEmail(user.email, code);
  }

  return success(res, {
    message: "If an account exists for that email, a reset code has been sent.",
  });
});

// POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, newPassword } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+resetCodeHash +resetCodeExpires"
  );

  if (!user || !user.resetCodeHash || !user.resetCodeExpires) {
    return fail(res, 400, "Invalid or expired reset code.", "INVALID_RESET_CODE");
  }

  if (user.resetCodeExpires.getTime() < Date.now()) {
    return fail(res, 400, "This reset code has expired. Request a new one.", "RESET_CODE_EXPIRED");
  }

  const codeMatches = await bcrypt.compare(code, user.resetCodeHash);
  if (!codeMatches) {
    return fail(res, 400, "Invalid or expired reset code.", "INVALID_RESET_CODE");
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetCodeHash = undefined;
  user.resetCodeExpires = undefined;
  await user.save();

  const token = signToken(user._id);
  return success(res, { message: "Password updated.", token });
});

module.exports = { signup, login, getMe, updateMe, forgotPassword, resetPassword };
