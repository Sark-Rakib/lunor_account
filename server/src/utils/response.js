const AppError = require("./AppError");

const apiResponse = (res, statusCode, success, message, data = null, meta = undefined) => {
  const body = { success, message };
  if (data !== null && data !== undefined) body.data = data;
  if (meta !== undefined) body.meta = meta;
  return res.status(statusCode).json(body);
};

const sendSuccess = (res, data, message = "Success", statusCode = 200, meta) =>
  apiResponse(res, statusCode, true, message, data, meta);

const sendError = (res, message = "Something went wrong", statusCode = 400, data = null) =>
  apiResponse(res, statusCode, false, message, data);

const notFoundError = (entity) => new AppError(`${entity} not found`, 404);

module.exports = { apiResponse, sendSuccess, sendError, notFoundError };