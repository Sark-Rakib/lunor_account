const ActivityLog = require("../models/ActivityLog");

async function logActivity({
  user = null,
  action,
  entity,
  entityId = null,
  description = "",
  details = {},
} = {}) {
  try {
    const entry = await ActivityLog.create({
      user: user?._id || user || null,
      userName: typeof user === "object" && user ? user.name || "" : "",
      action,
      entity,
      entityId,
      description,
      details,
    });
    return entry;
  } catch (err) {
    console.error("[activity] failed to log:", err.message);
    return null;
  }
}

module.exports = { logActivity };