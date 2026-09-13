const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const expenseController = require("../controllers/expenseController");

const router = express.Router();

router.use(protect);
router.get("/", authorize("expenses"), expenseController.listExpenses);
router.get("/:id", authorize("expenses"), expenseController.getExpense);
router.post("/", authorize("expenses"), expenseController.createExpense);
router.put("/:id", authorize("expenses"), expenseController.updateExpense);
router.delete("/:id", authorize("expenses"), expenseController.deleteExpense);

module.exports = router;