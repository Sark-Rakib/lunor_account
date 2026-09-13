const ActivityLog = require("../models/ActivityLog");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { applyPagination, paginatedResponse } = require("../utils/pagination");

const listActivities = asyncHandler(async (req, res) => {
  const { page, limit, skip } = applyPagination(req.query, 50);
  const filter = {};
  if (req.query.action) filter.action = req.query.action;
  if (req.query.entity) filter.entity = req.query.entity;
  if (req.query.search) filter.description = { $regex: new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") };

  const [docs, total] = await Promise.all([
    ActivityLog.find(filter).populate("user", "name").sort({ createdAt: -1 }).skip(skip).limit(limit),
    ActivityLog.countDocuments(filter),
  ]);
  sendSuccess(res, paginatedResponse(page, limit, total, docs), "Activity log fetched", 200);
});

module.exports = { listActivities };