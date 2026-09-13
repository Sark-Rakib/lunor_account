const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const settingsController = require("../controllers/settingsController");

const router = express.Router();

router.use(protect);
router.get("/", settingsController.getSettingsHandler);
router.put("/", authorize("admin"), settingsController.updateSettings);

module.exports = router;