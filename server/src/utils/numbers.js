const AppError = require("./AppError");

function toNumber(value, field = "value") {
  const num = Number(value);
  if (value === undefined || value === null || value === "" || Number.isNaN(num)) {
    throw new AppError(`${field} is required and must be a number`, 400);
  }
  return num;
}

function toNonNegative(value, field = "value") {
  const num = toNumber(value, field);
  if (num < 0) throw new AppError(`${field} must not be negative`, 400);
  return num;
}

module.exports = { toNumber, toNonNegative };