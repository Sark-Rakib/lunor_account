const express = require("express");
const { protect } = require("../middlewares/auth");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", protect, authController.me);
router.post("/change-password", protect, authController.changePassword);

module.exports = router;