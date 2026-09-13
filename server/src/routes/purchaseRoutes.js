const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const purchaseController = require("../controllers/purchaseController");

const router = express.Router();

router.use(protect);
router.get("/", authorize("purchases"), purchaseController.listPurchases);
router.get("/:id", authorize("purchases"), purchaseController.getPurchase);
router.post("/", authorize("purchases"), purchaseController.createPurchaseHandler);

module.exports = router;