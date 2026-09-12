const mongoose = require("mongoose");

const cvAnalysisSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    cvText: { type: String, required: true },
    score: { type: Number, required: true },
    strengths: [String],
    weaknesses: [String],
    missingKeywords: [String],
    missingSkills: [String],
    formattingSuggestions: [String],
    experienceSuggestions: [String],
    educationSuggestions: [String],
    recommendations: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model("CVAnalysis", cvAnalysisSchema);
