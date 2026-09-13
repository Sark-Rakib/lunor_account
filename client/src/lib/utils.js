import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function todayStr() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function formatMoney(value) {
  const n = Number(value || 0);
  return "৳" + n.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
  });
}

export function formatCompact(value) {
  const str = String(value ?? "").trim();
  const isPercent = str.endsWith("%");
  const raw = isPercent ? str.slice(0, -1) : str;
  const n = Number(raw);
  if (Number.isNaN(n)) return str || "৳0";

  if (isPercent) {
    const compact =
      Math.abs(n) >= 1000 ? (n / 1000).toFixed(1) + "k" : String(Number(n.toFixed(1)));
    return compact + "%";
  }

  if (Math.abs(n) >= 10000000) return "৳" + (n / 10000000).toFixed(2) + "Cr";
  if (Math.abs(n) >= 100000) return "৳" + (n / 100000).toFixed(2) + "L";
  if (Math.abs(n) >= 1000) return "৳" + (n / 1000).toFixed(1) + "k";
  return formatMoney(n);
}

export function formatDate(value) {
  if (!value) return "—";
  return dayjs(value).format("DD MMM YYYY");
}

export function formatDateTime(value) {
  if (!value) return "—";
  return dayjs(value).format("DD MMM YYYY, h:mm A");
}

export function downloadBlob(content, filename, type = "application/octet-stream") {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function initials(name = "") {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function getInitialsColor(name = "") {
  const colors = [
    "bg-indigo-500",
    "bg-rose-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-sky-500",
    "bg-violet-500",
    "bg-teal-500",
    "bg-pink-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return colors[hash % colors.length];
}