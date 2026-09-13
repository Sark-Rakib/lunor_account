const mongoose = require("mongoose");
const { NOTIFICATION_TYPES } = require("../constants");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    type: { type: String, enum: NOTIFICATION_TYPES, default: "system" },
    entityType: { type: String, default: "" },
    entity: { type: mongoose.Schema.Types.ObjectId, default: null },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);