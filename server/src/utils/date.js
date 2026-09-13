const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = process.env.BUSINESS_TIMEZONE || "Asia/Dhaka";

function startOfDay(date = new Date()) {
  return dayjs(date).tz(TIMEZONE).startOf("day").toDate();
}

function endOfDay(date = new Date()) {
  return dayjs(date).tz(TIMEZONE).endOf("day").toDate();
}

const DATE_PRESETS = {
  today: () => ({ start: startOfDay(), end: endOfDay() }),
  yesterday: () => ({
    start: startOfDay(dayjs().subtract(1, "day").toDate()),
    end: endOfDay(dayjs().subtract(1, "day").toDate()),
  }),
  week: () => {
    const now = dayjs().tz(TIMEZONE);
    const monday = now.startOf("day").subtract((now.day() + 6) % 7, "days");
    return { start: monday.toDate(), end: endOfDay() };
  },
  month: () => ({
    start: dayjs().tz(TIMEZONE).startOf("month").toDate(),
    end: endOfDay(),
  }),
  year: () => ({
    start: dayjs().tz(TIMEZONE).startOf("year").toDate(),
    end: endOfDay(),
  }),
  all: () => ({
    start: dayjs("1970-01-01").tz(TIMEZONE).toDate(),
    end: endOfDay(),
  }),
};

function parseDateRange(query = {}) {
  const { start, end, period, dateFrom, dateTo } = query;

  let range = { start: null, end: null };

  if (period) {
    const fn = DATE_PRESETS[period];
    if (fn) range = fn();
  }

  if (dateFrom || dateTo) {
    if (dateFrom) range.start = startOfDay(new Date(dateFrom));
    if (dateTo) range.end = endOfDay(new Date(dateTo));
  } else if (start) {
    range.start = startOfDay(new Date(start));
  } else if (!range.start) {
    range.start = DATE_PRESETS.all().start;
  }
  if (end && !dateTo) {
    range.end = endOfDay(new Date(end));
  } else if (!range.end) {
    range.end = DATE_PRESETS.all().end;
  }

  return { start: range.start, end: range.end, preset: period || "custom" };
}

function previousPeriod(range) {
  const duration = range.end.getTime() - range.start.getTime() + 1;
  const prevEnd = new Date(range.start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - duration + 1);
  return { start: prevStart, end: prevEnd };
}

function compareValue(current, previous) {
  if (previous === null || previous === undefined) return null;
  const diff = current - previous;
  const pct = previous === 0 ? (current === 0 ? 0 : 100) : (diff / previous) * 100;
  return { current, previous, diff, percent: Number(pct.toFixed(1)) };
}

module.exports = {
  TIMEZONE,
  startOfDay,
  endOfDay,
  DATE_PRESETS,
  parseDateRange,
  previousPeriod,
  compareValue,
  dayjs,
};