const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    careerGoal: { type: String, default: "" },
    skills: [{ type: String }],
    darkModeEnabled: { type: Boolean, default: false },
    notificationsEnabled: { type: Boolean, default: true },
    language: { type: String, default: "en" },
    resetCodeHash: { type: String, select: false },
    resetCodeExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

// Never return the password hash OR reset code fields in API responses.
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.resetCodeHash;
    delete ret.resetCodeExpires;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
