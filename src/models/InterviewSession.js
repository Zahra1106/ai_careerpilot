const mongoose = require("mongoose");

const qaSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String },
    score: { type: Number },
    clarity: { type: Number },
    technicalAccuracy: { type: Number },
    confidence: { type: Number },
    missingPoints: [String],
    betterAnswer: { type: String },
    improvementTips: [String],
  },
  { _id: false }
);

const interviewSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    jobRole: { type: String, required: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
    interviewType: {
      type: String,
      enum: ["Technical", "HR", "Behavioral", "Mixed"],
      default: "Mixed",
    },
    exchanges: [qaSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("InterviewSession", interviewSessionSchema);
