const express = require("express");
const { getSummary } = require("../controllers/dashboardController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/summary", requireAuth, getSummary);

module.exports = router;
