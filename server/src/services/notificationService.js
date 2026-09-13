const Notification = require("../models/Notification");

async function createNotification({
  user = null,
  title,
  message = "",
  type = "system",
  entityType = "",
  entity = null,
} = {}) {
  try {
    return await Notification.create({ user, title, message, type, entityType, entity });
  } catch (err) {
    console.error("[notification] failed to create:", err.message);
    return null;
  }
}

async function createForRole(role, payload) {
  const User = require("../models/User");
  const users = await User.find({ role, active: true }).select("_id").lean();
  const created = [];
  for (const u of users) {
    const n = await createNotification({ ...payload, user: u._id });
    if (n) created.push(n);
  }
  return created;
}

module.exports = { createNotification, createForRole };