const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const activityLogController = require("../controllers/activityLogController");

const router = express.Router();

router.use(protect);
router.get("/", authorize("admin"), activityLogController.listActivities);

module.exports = router;