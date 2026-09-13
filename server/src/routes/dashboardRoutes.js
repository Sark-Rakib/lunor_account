const express = require("express");
const { protect } = require("../middlewares/auth");
const dashboardService = require("../services/dashboardService");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const router = express.Router();

router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const data = await dashboardService.getDashboard(req.query);
    sendSuccess(res, { dashboard: data }, "Dashboard data", 200);
  })
);

module.exports = router;