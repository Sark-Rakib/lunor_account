const mongoose = require("mongoose");

function buildFilter(query, { searchFields = [], dateField = "createdAt", extra = {} } = {}) {
  const filter = {};
  const { search, from, to, status } = query;

  if (search && searchFields.length > 0) {
    const or = searchFields.map((f) => ({
      [f]: { $regex: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
    }));
    filter.$or = or;
  }

  if (from || to) {
    filter[dateField] = {};
    if (from) filter[dateField].$gte = new Date(from);
    if (to) filter[dateField].$lte = new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000 - 1);
  }

  if (status) filter.status = status;

  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      if (key === dateField && (filter[dateField] || {}).$gte) return;
      if (key === "status" && status) return;
      filter[key] = value;
    }
  });

  return filter;
}

module.exports = { buildFilter };