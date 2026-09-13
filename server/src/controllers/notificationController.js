const Notification = require("../models/Notification");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { applyPagination, paginatedResponse } = require("../utils/pagination");

const listNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = applyPagination(req.query, 20);
  const filter = req.user.role === "admin" ? {} : { $or: [{ user: req.user._id }, { user: null }] };
  const [docs, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);
  const unread = await Notification.countDocuments({ ...filter, read: false });
  sendSuccess(res, paginatedResponse(page, limit, total, docs), "Notifications fetched", 200, { unread });
});

const unreadCount = asyncHandler(async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { $or: [{ user: req.user._id }, { user: null }] };
  const count = await Notification.countDocuments({ ...filter, read: false });
  sendSuccess(res, { count }, "Unread count", 200);
});

const markRead = asyncHandler(async (req, res) => {
  const filter = req.user.role === "admin" ? { _id: req.params.id } : { _id: req.params.id, $or: [{ user: req.user._id }, { user: null }] };
  const notif = await Notification.findOneAndUpdate(filter, { read: true, readAt: new Date() }, { new: true });
  if (!notif) throw new AppError("Notification not found", 404);
  sendSuccess(res, { notification: notif }, "Marked as read", 200);
});

const markAllRead = asyncHandler(async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { $or: [{ user: req.user._id }, { user: null }] };
  await Notification.updateMany({ ...filter, read: false }, { read: true, readAt: new Date() });
  sendSuccess(res, {}, "All notifications marked as read", 200);
});

module.exports = { listNotifications, unreadCount, markRead, markAllRead };