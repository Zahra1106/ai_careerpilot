const express = require("express");
const { signup, login, getMe, updateMe, forgotPassword, resetPassword } = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");
const { validateBody } = require("../middleware/validateMiddleware");

const router = express.Router();

router.post(
  "/signup",
  validateBody({
    name: { required: true, type: "string", minLength: 2 },
    email: { required: true, type: "string", minLength: 5 },
    password: { required: true, type: "string", minLength: 6 },
  }),
  signup
);

router.post(
  "/login",
  validateBody({
    email: { required: true, type: "string" },
    password: { required: true, type: "string" },
  }),
  login
);

router.post(
  "/forgot-password",
  validateBody({
    email: { required: true, type: "string", minLength: 5 },
  }),
  forgotPassword
);

router.post(
  "/reset-password",
  validateBody({
    email: { required: true, type: "string", minLength: 5 },
    code: { required: true, type: "string", minLength: 6 },
    newPassword: { required: true, type: "string", minLength: 6 },
  }),
  resetPassword
);

router.get("/me", requireAuth, getMe);
router.put("/me", requireAuth, updateMe);

module.exports = router;
