const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const supplierController = require("../controllers/supplierController");

const router = express.Router();

router.use(protect);
router.get("/", authorize("suppliers"), supplierController.listSuppliers);
router.get("/:id", authorize("suppliers"), supplierController.getSupplier);
router.post("/", authorize("suppliers"), supplierController.createSupplier);
router.put("/:id", authorize("suppliers"), supplierController.updateSupplier);
router.delete("/:id", authorize("suppliers"), supplierController.deleteSupplier);
router.post("/:id/payments", authorize("suppliers"), supplierController.recordSupplierPayment);

module.exports = router;