const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const productController = require("../controllers/productController");

const router = express.Router();

router.use(protect);
router.get("/static/options", productController.getStaticOptions);
router.get("/low-stock", authorize("inventory"), productController.lowStock);
router.get("/out-of-stock", authorize("inventory"), productController.outOfStock);
router.get("/", authorize("products"), productController.listProducts);
router.get("/:id", authorize("products"), productController.getProduct);
router.post("/", authorize("products"), productController.createProduct);
router.put("/:id", authorize("products"), productController.updateProduct);
router.put("/:id/stock", authorize("inventory"), productController.adjustStock);
router.delete("/:id", authorize("products"), productController.deleteProduct);

module.exports = router;