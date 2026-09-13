const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const orderController = require("../controllers/orderController");

const router = express.Router();

router.use(protect);
router.get("/", authorize("orders"), orderController.listOrders);
router.get("/:id", authorize("orders"), orderController.getOrder);
router.post("/", authorize("orders"), orderController.createOrderHandler);
router.put("/:id", authorize("orders"), orderController.editOrder);
router.put("/:id/status", authorize("orders"), orderController.changeStatus);

module.exports = router;