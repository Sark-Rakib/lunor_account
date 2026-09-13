const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const targetController = require("../controllers/targetController");

const router = express.Router();

router.use(protect);
router.get("/", authorize("targets"), targetController.listTargets);
router.get("/current", authorize("targets"), targetController.getTarget);
router.post("/", authorize("targets"), targetController.saveTarget);

module.exports = router;