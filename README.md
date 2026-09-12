# AI CareerPilot — Backend

Node.js + Express API that sits between the Flutter app and the AI provider.
Flutter never talks to the AI API directly — every request goes through this
server so the API key is never exposed on-device.

## 1. Folder structure

```
ai-careerpilot-backend/
├── server.js                  # App entry point
├── package.json
├── .env.example                # Copy to .env and fill in
└── src/
    ├── config/
    │   └── db.js                # MongoDB connection
    ├── controllers/
    │   ├── authController.js
    │   ├── aiController.js
    │   └── applicationController.js
    ├── routes/
    │   ├── authRoutes.js
    │   ├── aiRoutes.js
    │   └── applicationRoutes.js
    ├── services/
    │   └── aiService.js         # All AI provider calls live here
    ├── middleware/
    │   ├── authMiddleware.js    # JWT verification
    │   ├── errorMiddleware.js   # Central error handler
    │   └── validateMiddleware.js
    ├── models/
    │   ├── User.js
    │   ├── CVAnalysis.js
    │   ├── JobMatch.js
    │   ├── Application.js
    │   └── InterviewSession.js
    └── utils/
        ├── apiResponse.js       # { success, data } / { success, error }
        ├── asyncHandler.js
        └── extractText.js       # PDF/DOCX → plain text
```

## 2. Getting a free AI API key (Groq — default provider)

1. Go to **https://console.groq.com** and sign up (no credit card required).
2. Go to **API Keys** → **Create API Key**.
3. Copy the key.

Groq's free tier gives generous daily request limits on fast Llama 3.x
models — plenty for a portfolio demo. If you ever want to switch providers
(OpenAI, Together.ai, etc.), you only need to change three `.env` values —
`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` — because the code talks to any
OpenAI-compatible `/chat/completions` endpoint. Nothing else changes.

## 3. Setup

```bash
cd ai-careerpilot-backend
npm install
cp .env.example .env
```

Edit `.env`:

```
MONGO_URI=mongodb://127.0.0.1:27017/ai_careerpilot
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
AI_API_KEY=<your Groq key>
```

### MongoDB options
- **Local**: install MongoDB Community Edition and it'll run at the default URI above.
- **Free cloud (recommended for a portfolio demo)**: create a free MongoDB
  Atlas cluster (M0 tier, no cost) at https://www.mongodb.com/cloud/atlas
  and paste the connection string into `MONGO_URI`.

The server will still boot without Mongo configured — health check and
stateless endpoints work — but anything that reads/writes a user, CV
analysis, or application will fail until it's connected.

## 4. Run it

```bash
npm run dev     # nodemon, auto-restarts on file changes
# or
npm start
```

You should see:
```
✅ MongoDB connected
🚀 AI CareerPilot API running at http://localhost:5000
```

## 5. Test it

```bash
curl http://localhost:5000/api/health
```

Signup:
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","password":"secret123"}'
```

Copy the returned `token`, then analyze a CV:
```bash
curl -X POST http://localhost:5000/api/ai/analyze-cv \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"cvText":"Experienced Flutter developer with 3 years building cross-platform mobile apps using Dart, Firebase, and REST APIs. Led a team of 4 engineers..."}'
```

Or upload a real file instead of pasting text:
```bash
curl -X POST http://localhost:5000/api/ai/analyze-cv \
  -H "Authorization: Bearer <TOKEN>" \
  -F "cv=@/path/to/resume.pdf"
```

## 6. API reference

All endpoints return `{ "success": true, "data": {...} }` on success or
`{ "success": false, "error": { "code", "message" } }` on failure — the
Flutter app can rely on this shape everywhere.

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| POST | `/api/auth/signup` | — | `name, email, password` |
| POST | `/api/auth/login` | — | `email, password` |
| POST | `/api/auth/forgot-password` | — | `email` — always returns success, sends a 6-digit code by email (or logs it to console if SMTP isn't configured) |
| POST | `/api/auth/reset-password` | — | `email, code, newPassword` — code expires after `RESET_CODE_EXPIRES_MINUTES` (default 15) |
| GET | `/api/auth/me` | ✓ | — |
| PUT | `/api/auth/me` | ✓ | `name?, careerGoal?, skills?, darkModeEnabled?, ...` |
| GET | `/api/dashboard/summary` | ✓ | — real aggregation: latest CV score, job match count, application count, average interview score |
| POST | `/api/ai/analyze-cv` | ✓ | multipart `cv` file **or** `{ cvText }` |
| POST | `/api/ai/match-job` | ✓ | `cvText, jobDescription` |
| POST | `/api/ai/improve-cv` | ✓ | `text, mode: improve\|shorten\|professional\|ats` |
| POST | `/api/ai/cover-letter` | ✓ | `jobTitle, companyName, jobDescription, cvText?` |
| POST | `/api/ai/interview-question` | ✓ | `jobRole, difficulty, interviewType, sessionId?` |
| POST | `/api/ai/evaluate-answer` | ✓ | `sessionId?, question, answer, jobRole?` |
| POST | `/api/ai/skill-gap` | ✓ | `currentSkills[], requiredSkills[]` |
| POST | `/api/applications` | ✓ | `company, position, jobUrl?, status?, notes?` |
| GET | `/api/applications?status=&page=&limit=` | ✓ | — |
| PUT | `/api/applications/:id` | ✓ | any updatable field |
| DELETE | `/api/applications/:id` | ✓ | — |

Every `✓` route requires header: `Authorization: Bearer <token>` (from
signup/login response).

### Password reset email (optional but recommended)

Forgot-password works out of the box without any setup — if `EMAIL_USER`
is blank in `.env`, the reset code is printed to the server console
instead of emailed, so you can test the full flow immediately:

```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" -d '{"email":"jane@example.com"}'
# check your server console for: "📧 [DEV MODE...] Password reset code for jane@example.com: 483920"

curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","code":"483920","newPassword":"newSecret123"}'
```

To actually send the email, set `EMAIL_HOST`/`EMAIL_USER`/`EMAIL_PASS` in
`.env` — see the comments in `.env.example` for Gmail App Password or
Resend setup (both free).

## 7. What was verified before handing this off

- All 22 backend files pass `node --check` (no syntax errors).
- `npm install` completes with **zero vulnerabilities**.
- Server boots cleanly with no `.env` configured.
- Live-tested: `/api/health`, signup validation, unknown-route 404,
  forgot-password (confirmed it fails gracefully — not silently — when
  Mongo isn't connected, and confirmed reset-password's validation
  fires correctly), and confirmed `/api/dashboard/summary` correctly
  requires auth (401 without a token).
- **Could not test the full DB-backed round-trip** (signup → forgot
  code → reset → login with new password, or the dashboard aggregation
  against real data) — MongoDB isn't installable in the sandbox I built
  this in (removed from Ubuntu's default repos; MongoDB's own repo isn't
  on my allowed domain list). I did a careful manual logic review of
  both flows instead. Please run the curl sequence above once your
  `.env` is filled in — if anything's off, send it back and I'll fix it
  immediately.

## 8. Security notes

- Passwords are hashed with bcrypt (10 rounds) — never stored in plain text.
- JWT is required on every route that touches user data; `req.userId` comes
  from the verified token, **never** from the request body.
- AI API key lives only in `.env` on the server — it is never sent to or
  readable by the Flutter app.
- File uploads are capped at 5MB and restricted to PDF/DOCX/TXT.
- AI endpoints are rate-limited per IP (20 req/min by default) to protect
  your free-tier quota.
