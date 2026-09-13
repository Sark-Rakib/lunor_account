const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const returnController = require("../controllers/returnController");

const router = express.Router();

router.use(protect);
router.get("/", authorize("returns"), returnController.listReturns);
router.get("/:id", authorize("returns"), returnController.getReturn);
router.post("/", authorize("returns"), returnController.createReturnHandler);
router.put("/:id/status", authorize("returns"), returnController.updateReturnStatus);

module.exports = router;