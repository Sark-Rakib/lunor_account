const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const saleController = require("../controllers/saleController");

const router = express.Router();

router.use(protect);
router.get("/", authorize("sales"), saleController.listSales);
router.get("/:id", authorize("sales"), saleController.getSale);
router.post("/", authorize("sales"), saleController.createSaleHandler);
router.post("/:id/payments", authorize("sales"), saleController.recordPayment);
router.put("/:id", authorize("sales"), saleController.editSale);
router.delete("/:id", authorize("sales"), saleController.cancelSaleHandler);

module.exports = router;