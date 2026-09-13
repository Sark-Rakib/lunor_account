const AppError = require("../utils/AppError");

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const first = result.error.errors[0];
    throw new AppError(`${first.path.join(".")}: ${first.message}`, 400);
  }
  req.body = result.data;
  next();
};

module.exports = { validate };