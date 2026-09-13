const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const customerController = require("../controllers/customerController");

const router = express.Router();

router.use(protect);
router.get("/", authorize("customers"), customerController.listCustomers);
router.get("/:id", authorize("customers"), customerController.getCustomer);
router.post("/", authorize("customers"), customerController.createCustomer);
router.put("/:id", authorize("customers"), customerController.updateCustomer);
router.delete("/:id", authorize("customers"), customerController.deleteCustomer);
router.post("/:id/payments", authorize("sales"), customerController.recordCustomerPayment);

module.exports = router;