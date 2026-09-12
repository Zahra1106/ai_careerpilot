const mongoose = require("mongoose");

const jobMatchSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    jobDescription: { type: String, required: true },
    matchPercentage: { type: Number, required: true },
    matchingSkills: [String],
    missingSkills: [String],
    missingKeywords: [String],
    relevantExperience: [String],
    recommendations: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model("JobMatch", jobMatchSchema);
