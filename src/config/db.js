const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn(
      "⚠️  MONGO_URI is not set. Application/CV persistence endpoints will fail until it's configured."
    );
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    console.error(
      "   The server will keep running so you can still test AI endpoints that don't need the DB."
    );
  }
}

module.exports = connectDB;
