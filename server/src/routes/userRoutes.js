const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const userController = require("../controllers/userController");

const router = express.Router();

router.use(protect);
router.get("/", authorize("admin"), userController.listUsers);
router.get("/:id", authorize("admin"), userController.getUser);
router.post("/", authorize("admin"), userController.createUser);
router.put("/:id", authorize("admin"), userController.updateUser);
router.delete("/:id", authorize("admin"), userController.deleteUser);

module.exports = router;