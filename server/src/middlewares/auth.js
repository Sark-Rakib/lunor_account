const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const { ROLE_PERMISSIONS } = require("../constants");

const protect = async (req, res, next) => {
  try {
    let token;
    const auth = req.headers.authorization || "";
    if (auth.startsWith("Bearer ")) token = auth.split(" ")[1];
    if (!token) throw new AppError("Not authorized, no token", 401);

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret_change_me");

    const user = await User.findById(decoded.id);
    if (!user) throw new AppError("User no longer exists", 401);
    if (!user.active) throw new AppError("Account is deactivated", 401);

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return next(new AppError("Session expired, please login again", 401));
    }
    next(err);
  }
};

const hasPermission = (user, permission) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  const perms = ROLE_PERMISSIONS[user.role] || [];
  return perms.includes(permission) || perms.includes("*");
};

const authorize = (permission) => (req, res, next) => {
  if (!hasPermission(req.user, permission)) {
    return next(new AppError("You do not have permission to perform this action", 403));
  }
  next();
};

const authorizeRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return next(new AppError("You do not have permission to perform this action", 403));
  }
  next();
};

module.exports = { protect, authorize, authorizeRole, hasPermission };