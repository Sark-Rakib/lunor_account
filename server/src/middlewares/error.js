const AppError = require("../utils/AppError");

const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  if (err.name === "CastError") {
    error = new AppError(`Invalid ${err.path}: ${err.value}`, 400);
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    error = new AppError(`Duplicate value for ${field}. This record already exists.`, 400);
  }
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = new AppError(messages.join(", "), 400);
  }

  const statusCode = error.statusCode || err.statusCode || 500;
  const isOperational = error.isOperational !== undefined ? error.isOperational : true;

  const body = {
    success: false,
    message: error.message || "Internal server error",
  };

  if (process.env.NODE_ENV !== "production") {
    body.stack = err.stack;
  }

  console.error(`[error] ${statusCode} - ${error.message}`);
  if (!isOperational) console.error(err.stack);

  return res.status(statusCode).json(body);
};

module.exports = { notFound, errorHandler };