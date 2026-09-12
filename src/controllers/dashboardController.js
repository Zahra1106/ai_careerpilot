const CVAnalysis = require("../models/CVAnalysis");
const JobMatch = require("../models/JobMatch");
const Application = require("../models/Application");
const InterviewSession = require("../models/InterviewSession");
const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/apiResponse");

// GET /api/dashboard/summary
// Real aggregation across the user's own data — no invented numbers.
const getSummary = asyncHandler(async (req, res) => {
  const userId = req.userId;

  const [latestCv, jobMatchCount, applicationCount, sessions] = await Promise.all([
    CVAnalysis.findOne({ user: userId }).sort({ createdAt: -1 }).select("score"),
    JobMatch.countDocuments({ user: userId }),
    Application.countDocuments({ user: userId }),
    InterviewSession.find({ user: userId }).select("exchanges.score"),
  ]);

  // Interview readiness = average score across all answered exchanges
  // that have been evaluated, rounded to the nearest integer.
  const scoredExchanges = sessions
    .flatMap((s) => s.exchanges)
    .map((e) => e.score)
    .filter((score) => typeof score === "number");

  const interviewReadiness =
    scoredExchanges.length > 0
      ? Math.round(scoredExchanges.reduce((sum, s) => sum + s, 0) / scoredExchanges.length)
      : 0;

  return success(res, {
    cvScore: latestCv?.score ?? 0,
    jobMatches: jobMatchCount,
    applications: applicationCount,
    interviewReadiness,
    hasAnyActivity: Boolean(latestCv) || jobMatchCount > 0 || applicationCount > 0 || scoredExchanges.length > 0,
  });
});

module.exports = { getSummary };
