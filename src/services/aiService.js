const axios = require("axios");

const AI_API_KEY = process.env.AI_API_KEY;
const AI_BASE_URL = process.env.AI_BASE_URL || "https://api.groq.com/openai/v1";
const AI_MODEL = process.env.AI_MODEL || "llama-3.3-70b-versatile";

const client = axios.create({
  baseURL: AI_BASE_URL,
  timeout: 30000,
  headers: {
    Authorization: `Bearer ${AI_API_KEY}`,
    "Content-Type": "application/json",
  },
});

/**
 * Calls the configured OpenAI-compatible chat completion endpoint and
 * forces a strict JSON response. Works unmodified with Groq, OpenAI,
 * Together.ai, or any other OpenAI-compatible /chat/completions API —
 * only the .env values need to change to switch providers.
 *
 * @param {string} systemPrompt - Instructions + required JSON shape.
 * @param {string} userPrompt - The actual task content (CV text, job desc, etc).
 * @returns {Promise<object>} Parsed JSON object from the model.
 */
async function callAI(systemPrompt, userPrompt) {
  if (!AI_API_KEY) {
    const err = new Error(
      "AI_API_KEY is not configured on the server. Add it to your .env file."
    );
    err.statusCode = 500;
    err.code = "AI_UNAVAILABLE";
    throw err;
  }

  let response;
  try {
    response = await client.post("/chat/completions", {
      model: AI_MODEL,
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
  } catch (err) {
    throw mapAxiosError(err);
  }

  const rawContent = response.data?.choices?.[0]?.message?.content;

  if (!rawContent) {
    const err = new Error("AI returned an empty response.");
    err.statusCode = 502;
    err.code = "AI_INVALID_RESPONSE";
    throw err;
  }

  return safeParseJSON(rawContent);
}

function mapAxiosError(err) {
  if (err.code === "ECONNABORTED") {
    const e = new Error("AI request timed out.");
    e.statusCode = 504;
    e.code = "AI_TIMEOUT";
    return e;
  }

  const status = err.response?.status;

  if (status === 429) {
    const e = new Error("AI provider rate limit reached.");
    e.statusCode = 429;
    e.code = "AI_RATE_LIMITED";
    return e;
  }

  if (status === 401 || status === 403) {
    const e = new Error("AI provider rejected the API key.");
    e.statusCode = 500;
    e.code = "AI_UNAVAILABLE";
    return e;
  }

  const e = new Error(
    err.response?.data?.error?.message || "AI service is temporarily unavailable."
  );
  e.statusCode = 502;
  e.code = "AI_UNAVAILABLE";
  return e;
}

/**
 * Models occasionally wrap JSON in markdown fences or add stray text
 * even when json_object mode is requested. This strips that safely
 * instead of trusting raw output.
 */
function safeParseJSON(raw) {
  let text = raw.trim();

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      try {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1));
      } catch (e2) {
        /* fall through */
      }
    }
    const err = new Error("Could not parse AI response as JSON.");
    err.statusCode = 502;
    err.code = "AI_INVALID_RESPONSE";
    throw err;
  }
}

// ---------------------------------------------------------------------
// Feature-specific prompt builders. Each returns strict JSON matching
// the shape the Flutter app expects — see README "AI Response Contracts".
// ---------------------------------------------------------------------

async function analyzeCV(cvText) {
  const system = `You are an expert ATS (Applicant Tracking System) resume reviewer and career coach.
Analyze the given CV text and respond with ONLY a JSON object, no prose, in exactly this shape:
{
  "score": <integer 0-100, ATS compatibility + quality score>,
  "strengths": [<3-6 short strings>],
  "weaknesses": [<3-6 short strings>],
  "missingKeywords": [<industry-standard keywords missing from the CV>],
  "missingSkills": [<relevant skills not mentioned>],
  "formattingSuggestions": [<2-5 short strings>],
  "experienceSuggestions": [<2-5 short strings>],
  "educationSuggestions": [<1-3 short strings>],
  "recommendations": [<3-6 short, actionable strings>]
}`;
  return callAI(system, `CV TEXT:\n"""${cvText}"""`);
}

async function matchJob(cvText, jobDescription) {
  const system = `You are an expert recruiter comparing a candidate's CV against a job description.
Respond with ONLY a JSON object in exactly this shape:
{
  "matchPercentage": <integer 0-100>,
  "matchingSkills": [<skills present in both>],
  "missingSkills": [<required skills absent from CV>],
  "missingKeywords": [<important JD keywords missing from CV>],
  "relevantExperience": [<2-5 short strings summarizing relevant experience found>],
  "recommendations": [<3-6 short, actionable strings to improve the match>]
}`;
  return callAI(
    system,
    `CV TEXT:\n"""${cvText}"""\n\nJOB DESCRIPTION:\n"""${jobDescription}"""`
  );
}

async function improveCVText(originalText, mode) {
  const modeInstructions = {
    improve: "Rewrite it to be more impactful, specific, and achievement-oriented.",
    shorten: "Make it significantly more concise while keeping the key achievement.",
    professional: "Make the tone more formal and professional.",
    ats: "Rewrite it to be ATS-friendly: include relevant keywords naturally, avoid special characters, use standard phrasing.",
  };
  const instruction = modeInstructions[mode] || modeInstructions.improve;

  const system = `You are a professional resume writer. ${instruction}
Respond with ONLY a JSON object in exactly this shape:
{
  "original": <the original text, unchanged>,
  "improved": <the rewritten bullet point/text>,
  "explanation": <one short sentence on what changed and why>
}`;
  return callAI(system, `TEXT TO REWRITE:\n"""${originalText}"""`);
}

async function generateCoverLetter(jobTitle, companyName, jobDescription, cvText) {
  const system = `You are a professional cover letter writer.
Write a compelling, personalized, professional cover letter (3-4 paragraphs, ~250-350 words).
Respond with ONLY a JSON object in exactly this shape:
{
  "coverLetter": <the full cover letter as a single string with \\n for paragraph breaks>,
  "tone": <one word describing the tone used, e.g. "professional">
}`;
  return callAI(
    system,
    `JOB TITLE: ${jobTitle}\nCOMPANY: ${companyName}\nJOB DESCRIPTION:\n"""${jobDescription}"""\n\nCANDIDATE BACKGROUND (from CV, may be partial):\n"""${
      cvText || "Not provided."
    }"""`
  );
}

async function generateInterviewQuestion(jobRole, difficulty, interviewType, previousQuestions = []) {
  const system = `You are a senior technical interviewer conducting a ${interviewType} interview for a ${jobRole} role at ${difficulty} difficulty.
Generate exactly ONE new interview question, different from any previously asked ones.
Respond with ONLY a JSON object in exactly this shape:
{
  "question": <the interview question>,
  "type": "${interviewType}",
  "difficulty": "${difficulty}"
}`;
  const userPrompt =
    previousQuestions.length > 0
      ? `Previously asked questions (do not repeat these or close variants):\n${previousQuestions
          .map((q) => `- ${q}`)
          .join("\n")}`
      : "This is the first question of the session.";
  return callAI(system, userPrompt);
}

async function evaluateAnswer(question, answer, jobRole) {
  const system = `You are a senior interviewer evaluating a candidate's answer for a ${jobRole} role.
Respond with ONLY a JSON object in exactly this shape:
{
  "score": <integer 0-100>,
  "clarity": <integer 0-100>,
  "technicalAccuracy": <integer 0-100>,
  "confidence": <integer 0-100>,
  "missingPoints": [<2-5 short strings on what was missing>],
  "betterAnswer": <a strong model answer to the same question, 2-4 sentences>,
  "improvementTips": [<2-4 short, actionable strings>]
}`;
  return callAI(
    system,
    `QUESTION: ${question}\n\nCANDIDATE'S ANSWER:\n"""${answer}"""`
  );
}

async function skillGapAnalysis(currentSkills, requiredSkills) {
  const system = `You are a career development coach analyzing a skill gap.
Categorize skills into: Frontend, Backend, Database, Cloud, Tools, Soft Skills.
For each skill in the current or required lists, rate the candidate as "Strong", "Intermediate", or "Needs Improvement".
Respond with ONLY a JSON object in exactly this shape:
{
  "categories": [
    {
      "category": <one of the six categories above>,
      "skills": [
        { "name": <skill name>, "level": "Strong" | "Intermediate" | "Needs Improvement", "isGap": <true if required but missing/weak> }
      ]
    }
  ],
  "overallReadiness": <integer 0-100>,
  "topPriorities": [<2-4 skills the candidate should focus on next>]
}`;
  return callAI(
    system,
    `CURRENT SKILLS: ${currentSkills.join(", ") || "None provided"}\nREQUIRED SKILLS FOR TARGET ROLE: ${requiredSkills.join(
      ", "
    )}`
  );
}

module.exports = {
  analyzeCV,
  matchJob,
  improveCVText,
  generateCoverLetter,
  generateInterviewQuestion,
  evaluateAnswer,
  skillGapAnalysis,
};
