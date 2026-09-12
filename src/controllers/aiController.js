const aiService = require("../services/aiService");
const CVAnalysis = require("../models/CVAnalysis");
const JobMatch = require("../models/JobMatch");
const InterviewSession = require("../models/InterviewSession");
const { extractTextFromFile } = require("../utils/extractText");
const asyncHandler = require("../utils/asyncHandler");
const { success, fail } = require("../utils/apiResponse");

// POST /api/ai/analyze-cv
// Accepts either a multipart file upload (field "cv") OR { cvText } in JSON body.
const analyzeCV = asyncHandler(async (req, res) => {
  let cvText = req.body.cvText;

  if (req.file) {
    cvText = await extractTextFromFile(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );
  }

  if (!cvText || cvText.trim().length < 50) {
    return fail(
      res,
      400,
      "CV text is too short or missing. Upload a valid CV or paste at least a few sentences.",
      "INVALID_CV"
    );
  }

  const result = await aiService.analyzeCV(cvText);

  const saved = await CVAnalysis.create({
    user: req.userId,
    cvText,
    ...result,
  });

  return success(res, { analysisId: saved._id, ...result });
});

// POST /api/ai/match-job
const matchJob = asyncHandler(async (req, res) => {
  const { cvText, jobDescription } = req.body;

  const result = await aiService.matchJob(cvText, jobDescription);

  const saved = await JobMatch.create({
    user: req.userId,
    jobDescription,
    ...result,
  });

  return success(res, { matchId: saved._id, ...result });
});

// POST /api/ai/improve-cv
const improveCV = asyncHandler(async (req, res) => {
  const { text, mode } = req.body;
  const validModes = ["improve", "shorten", "professional", "ats"];
  const chosenMode = validModes.includes(mode) ? mode : "improve";

  const result = await aiService.improveCVText(text, chosenMode);
  return success(res, result);
});

// POST /api/ai/cover-letter
const coverLetter = asyncHandler(async (req, res) => {
  const { jobTitle, companyName, jobDescription, cvText } = req.body;

  const result = await aiService.generateCoverLetter(
    jobTitle,
    companyName,
    jobDescription,
    cvText
  );
  return success(res, result);
});

// POST /api/ai/interview-question
const interviewQuestion = asyncHandler(async (req, res) => {
  const { jobRole, difficulty, interviewType, sessionId } = req.body;

  let previousQuestions = [];
  let session = null;

  if (sessionId) {
    session = await InterviewSession.findOne({ _id: sessionId, user: req.userId });
    if (session) {
      previousQuestions = session.exchanges.map((e) => e.question);
    }
  }

  if (!session) {
    session = await InterviewSession.create({
      user: req.userId,
      jobRole,
      difficulty,
      interviewType,
      exchanges: [],
    });
  }

  const result = await aiService.generateInterviewQuestion(
    jobRole,
    difficulty,
    interviewType,
    previousQuestions
  );

  session.exchanges.push({ question: result.question });
  await session.save();

  return success(res, { sessionId: session._id, ...result });
});

// POST /api/ai/evaluate-answer
const evaluateAnswer = asyncHandler(async (req, res) => {
  const { sessionId, question, answer, jobRole } = req.body;

  const result = await aiService.evaluateAnswer(question, answer, jobRole || "the role");

  if (sessionId) {
    const session = await InterviewSession.findOne({ _id: sessionId, user: req.userId });
    if (session) {
      const exchange = [...session.exchanges].reverse().find((e) => e.question === question);
      if (exchange) {
        Object.assign(exchange, { answer, ...result });
        await session.save();
      }
    }
  }

  return success(res, result);
});

// POST /api/ai/skill-gap
const skillGap = asyncHandler(async (req, res) => {
  const { currentSkills = [], requiredSkills = [] } = req.body;

  if (!Array.isArray(requiredSkills) || requiredSkills.length === 0) {
    return fail(res, 400, "requiredSkills must be a non-empty array.", "VALIDATION_ERROR");
  }

  const result = await aiService.skillGapAnalysis(currentSkills, requiredSkills);
  return success(res, result);
});

module.exports = {
  analyzeCV,
  matchJob,
  improveCV,
  coverLetter,
  interviewQuestion,
  evaluateAnswer,
  skillGap,
};
