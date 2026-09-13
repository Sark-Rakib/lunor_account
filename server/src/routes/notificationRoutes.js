const express = require("express");
const { protect } = require("../middlewares/auth");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

router.use(protect);
router.get("/", notificationController.listNotifications);
router.get("/unread-count", notificationController.unreadCount);
router.put("/read-all", notificationController.markAllRead);
router.put("/:id/read", notificationController.markRead);

module.exports = router;