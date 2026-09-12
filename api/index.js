require("dotenv").config();
const connectDB = require("../src/config/db");
const app = require("../server");

// Serverless functions can be reused across "warm" invocations, so we
// cache the connection state on the module scope instead of reconnecting
// to MongoDB on every single request (which would be slow and could
// exhaust Atlas's connection limit under load).
let dbReady = false;

module.exports = async (req, res) => {
  if (!dbReady) {
    await connectDB();
    dbReady = true;
  }
  return app(req, res);
};