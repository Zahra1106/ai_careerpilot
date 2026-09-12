require("dotenv").config();
require("express-async-errors");

const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");

const authRoutes = require("./src/routes/authRoutes");
const aiRoutes = require("./src/routes/aiRoutes");
const applicationRoutes = require("./src/routes/applicationRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");
const { errorHandler, notFound } = require("./src/middleware/errorMiddleware");

const app = express();

// --- Core middleware ---
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN === "*" ? true : process.env.CLIENT_ORIGIN,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// --- Health check ---
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      service: "AI CareerPilot API",
      time: new Date().toISOString(),
    },
  });
});

// --- Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/dashboard", dashboardRoutes);

// --- 404 + error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 AI CareerPilot API running at http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
  });
}

start();

module.exports = app;
