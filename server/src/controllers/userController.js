const User = require("../models/User");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { applyPagination, paginatedResponse, buildSearchRegex } = require("../utils/pagination");
const { logActivity } = require("../services/activityService");
const { ROLES } = require("../constants");

const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = applyPagination(req.query, 20);
  const filter = {};
  if (req.query.search) filter.$or = [{ name: buildSearchRegex(req.query.search) }, { email: buildSearchRegex(req.query.search) }];
  if (req.query.role) filter.role = req.query.role;

  const [docs, total] = await Promise.all([
    User.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  sendSuccess(res, paginatedResponse(page, limit, total, docs), "Users fetched", 200);
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) throw new AppError("User not found", 404);
  sendSuccess(res, { user }, "User fetched", 200);
});

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  if (!name || !email || !password) throw new AppError("Name, email and password are required", 400);
  if (!ROLES.includes(role)) throw new AppError("Invalid role", 400);
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw new AppError("User already exists with this email", 400);
  const user = await User.create({ name, email, password, phone, role, active: true });
  await logActivity({ user: req.user, action: "created", entity: "User", entityId: user._id, description: `Created user ${user.name} (${user.role})` });
  sendSuccess(res, { user }, "User created", 201);
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError("User not found", 404);
  const { name, email, phone, role, active, password } = req.body;

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (phone !== undefined) user.phone = phone;
  if (role !== undefined) {
    if (!ROLES.includes(role)) throw new AppError("Invalid role", 400);
    user.role = role;
  }
  if (active !== undefined) user.active = active;
  if (password) user.password = password;
  await user.save();

  await logActivity({ user: req.user, action: "updated", entity: "User", entityId: user._id, description: `Updated user ${user.name}` });
  sendSuccess(res, { user }, "User updated", 200);
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError("User not found", 404);
  if (String(user._id) === String(req.user._id)) throw new AppError("You cannot delete your own account", 400);

  user.active = false;
  await user.save();
  await logActivity({ user: req.user, action: "deleted", entity: "User", entityId: user._id, description: `Deactivated user ${user.name}` });
  sendSuccess(res, {}, "User deactivated", 200);
});

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser };