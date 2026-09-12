const express = require("express");
const {
  createApplication,
  getApplications,
  updateApplication,
  deleteApplication,
} = require("../controllers/applicationController");
const { requireAuth } = require("../middleware/authMiddleware");
const { validateBody } = require("../middleware/validateMiddleware");

const router = express.Router();

router.use(requireAuth);

router.post(
  "/",
  validateBody({
    company: { required: true, type: "string" },
    position: { required: true, type: "string" },
    status: { enum: ["Saved", "Applied", "Interview", "Rejected", "Offer"] },
  }),
  createApplication
);

router.get("/", getApplications);
router.put("/:id", updateApplication);
router.delete("/:id", deleteApplication);

module.exports = router;
