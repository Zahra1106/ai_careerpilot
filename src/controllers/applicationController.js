const Application = require("../models/Application");
const asyncHandler = require("../utils/asyncHandler");
const { success, fail } = require("../utils/apiResponse");

// POST /api/applications
const createApplication = asyncHandler(async (req, res) => {
  const { company, position, jobUrl, dateApplied, status, notes } = req.body;

  const application = await Application.create({
    user: req.userId,
    company,
    position,
    jobUrl,
    dateApplied,
    status,
    notes,
  });

  return success(res, application, 201);
});

// GET /api/applications?status=Applied&page=1&limit=20
const getApplications = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = { user: req.userId };
  if (status) filter.status = status;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(parseInt(limit, 10) || 20, 100);

  const [items, total] = await Promise.all([
    Application.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Application.countDocuments(filter),
  ]);

  return success(res, items, 200, {
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum),
  });
});

// PUT /api/applications/:id
const updateApplication = asyncHandler(async (req, res) => {
  const application = await Application.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    req.body,
    { new: true, runValidators: true }
  );

  if (!application) {
    return fail(res, 404, "Application not found.", "NOT_FOUND");
  }

  return success(res, application);
});

// DELETE /api/applications/:id
const deleteApplication = asyncHandler(async (req, res) => {
  const application = await Application.findOneAndDelete({
    _id: req.params.id,
    user: req.userId,
  });

  if (!application) {
    return fail(res, 404, "Application not found.", "NOT_FOUND");
  }

  return success(res, { deleted: true });
});

module.exports = { createApplication, getApplications, updateApplication, deleteApplication };
