const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const incomeController = require("../controllers/incomeController");

const router = express.Router();

router.use(protect);
router.get("/", authorize("income"), incomeController.listIncomes);
router.get("/:id", authorize("income"), incomeController.getIncome);
router.post("/", authorize("income"), incomeController.createIncome);
router.put("/:id", authorize("income"), incomeController.updateIncome);
router.delete("/:id", authorize("income"), incomeController.deleteIncome);

module.exports = router;