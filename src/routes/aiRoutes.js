const express = require("express");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const {
  analyzeCV,
  matchJob,
  improveCV,
  coverLetter,
  interviewQuestion,
  evaluateAnswer,
  skillGap,
} = require("../controllers/aiController");
const { requireAuth } = require("../middleware/authMiddleware");
const { validateBody } = require("../middleware/validateMiddleware");

const router = express.Router();

// All AI routes require a logged-in user, and every AI call costs
// free-tier quota, so they're rate-limited per IP as a safety net.
const aiLimiter = rateLimit({
  windowMs: Number(process.env.AI_RATE_LIMIT_WINDOW_MS) || 60000,
  max: Number(process.env.AI_RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "AI_RATE_LIMITED", message: "Too many AI requests. Please slow down." },
  },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.use(requireAuth, aiLimiter);

router.post("/analyze-cv", upload.single("cv"), analyzeCV);

router.post(
  "/match-job",
  validateBody({
    cvText: { required: true, type: "string", minLength: 50 },
    jobDescription: { required: true, type: "string", minLength: 20 },
  }),
  matchJob
);

router.post(
  "/improve-cv",
  validateBody({
    text: { required: true, type: "string", minLength: 5 },
    mode: { enum: ["improve", "shorten", "professional", "ats"] },
  }),
  improveCV
);

router.post(
  "/cover-letter",
  validateBody({
    jobTitle: { required: true, type: "string" },
    companyName: { required: true, type: "string" },
    jobDescription: { required: true, type: "string", minLength: 20 },
  }),
  coverLetter
);

router.post(
  "/interview-question",
  validateBody({
    jobRole: { required: true, type: "string" },
    difficulty: { required: true, enum: ["Easy", "Medium", "Hard"] },
    interviewType: { required: true, enum: ["Technical", "HR", "Behavioral", "Mixed"] },
  }),
  interviewQuestion
);

router.post(
  "/evaluate-answer",
  validateBody({
    question: { required: true, type: "string" },
    answer: { required: true, type: "string", minLength: 5 },
  }),
  evaluateAnswer
);

router.post("/skill-gap", skillGap);

module.exports = router;
