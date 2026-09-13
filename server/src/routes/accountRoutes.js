const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const accountController = require("../controllers/accountController");

const router = express.Router();

router.use(protect);
router.get("/", authorize("accounts"), accountController.listAccounts);
router.post("/", authorize("accounts"), accountController.createAccount);
router.put("/:id", authorize("accounts"), accountController.updateAccount);
router.delete("/:id", authorize("accounts"), accountController.deleteAccount);
router.post("/recompute", authorize("accounts"), accountController.recompute);
router.get("/flow/cash-flow", authorize("accounts"), accountController.cashFlow);
router.get("/flow/payments", authorize("accounts"), accountController.paymentHistory);

module.exports = router;