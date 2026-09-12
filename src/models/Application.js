const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    company: { type: String, required: true, trim: true },
    position: { type: String, required: true, trim: true },
    jobUrl: { type: String, trim: true, default: "" },
    dateApplied: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["Saved", "Applied", "Interview", "Rejected", "Offer"],
      default: "Saved",
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Application", applicationSchema);
