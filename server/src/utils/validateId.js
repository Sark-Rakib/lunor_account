const mongoose = require("mongoose");
const AppError = require("./AppError");

const isValidObjectId = (id) => mongoose.isValidObjectId(id);

const parseId = (id, field = "id") => {
  if (!isValidObjectId(id)) throw new AppError(`Invalid ${field}`, 400);
  return id;
};

module.exports = { isValidObjectId, parseId };