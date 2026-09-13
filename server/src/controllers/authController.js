const jwt = require("jsonwebtoken");
const User = require("../models/User");
const BusinessSettings = require("../models/BusinessSettings");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { logActivity } = require("../services/activityService");

const signToken = (id) => {
  const options = {};
  if (process.env.JWT_EXPIRES_IN) options.expiresIn = process.env.JWT_EXPIRES_IN;
  return jwt.sign({ id }, process.env.JWT_SECRET || "dev_secret_change_me", options);
};

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError("Email and password are required", 400);

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    throw new AppError("Invalid email or password", 401);
  }
  if (!user.active) throw new AppError("Your account has been deactivated", 401);

  user.lastLoginAt = new Date();
  user.save({ validateBeforeSave: false });

  await logActivity({
    user,
    action: "login",
    entity: "User",
    entityId: user._id,
    description: `${user.name} logged in`,
  });

  const token = signToken(user._id);
  const publicUser = user.toObject();
  delete publicUser.password;
  sendSuccess(res, { token, user: publicUser }, "Login successful", 200);
});

const register = asyncHandler(async (req, res) => {
  const settings = await BusinessSettings.getSettings();
  if (!settings.registrationEnabled) {
    throw new AppError("Public registration is disabled. Contact an administrator.", 403);
  }
  const { name, email, password, phone } = req.body;
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw new AppError("User already exists with this email", 400);

  const user = await User.create({ name, email, password, phone, role: "staff" });
  await logActivity({ user, action: "created", entity: "User", entityId: user._id, description: `User ${user.name} registered` });
  const token = signToken(user._id);
  sendSuccess(res, { token, user }, "Account created", 201);
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  sendSuccess(res, { user }, "Current user", 200);
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) throw new AppError("Current and new password are required", 400);
  if (newPassword.length < 6) throw new AppError("New password must be at least 6 characters", 400);

  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.matchPassword(currentPassword))) {
    throw new AppError("Current password is incorrect", 400);
  }
  user.password = newPassword;
  await user.save();

  await logActivity({ user, action: "updated", entity: "User", entityId: user._id, description: "User changed own password" });
  sendSuccess(res, {}, "Password changed successfully", 200);
});

module.exports = { login, register, me, changePassword };