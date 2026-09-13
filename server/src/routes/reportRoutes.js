const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const reportController = require("../controllers/reportController");
const exportController = require("../controllers/exportController");

const router = express.Router();

router.use(protect, authorize("reports"));

router.get("/sales", reportController.getSalesReport);
router.get("/expenses", reportController.getExpenseReport);
router.get("/profit-loss", reportController.getProfitLossReport);
router.get("/inventory", reportController.getInventoryReport);
router.get("/products", reportController.getProductReport);
router.get("/customers", reportController.getCustomerReport);
router.get("/suppliers", reportController.getSupplierReport);
router.get("/cash-flow", reportController.getCashFlowReport);

router.get("/export/:type", exportController.exportCsv);
router.get("/export/:type/csv", exportController.exportCsv);
router.get("/export/:type/xlsx", exportController.exportXlsx);
router.get("/export/:type/pdf", exportController.exportPdf);

module.exports = router;