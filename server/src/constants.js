const ROLES = ["admin", "manager", "accountant", "staff"];

const ROLE_PERMISSIONS = {
  admin: ["*"],
  manager: [
    "products",
    "orders",
    "customers",
    "suppliers",
    "sales",
    "inventory",
    "purchases",
    "reports",
    "targets",
    "returns",
    "expenses",
    "income",
    "accounts",
  ],
  accountant: [
    "sales",
    "expenses",
    "income",
    "accounts",
    "reports",
    "returns",
    "targets",
  ],
  staff: ["products", "orders", "customers", "inventory"],
};

const PRODUCT_CATEGORIES = [
  "Formal Shirt",
  "Casual Shirt",
  "T-Shirt",
  "Pant",
  "Panjabi",
  "Baggy",
  "Bag",
  "Other",
];

const SIZES = ["S", "M", "L", "XL", "2XL"];
const PANT_SIZES = ["28", "30", "32", "34", "36"];

const PRODUCT_STATUS = ["active", "archived"];

const PAYMENT_METHODS = ["Cash", "bKash", "Nagad", "Bank", "Card", "Other"];

const PAYMENT_STATUS = ["paid", "partial", "unpaid"];

const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
  "Returned",
  "Refunded",
];

const ORDER_FLOW = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered"];

const RETURN_REASONS = [
  "Size issue",
  "Damaged",
  "Wrong product",
  "Customer changed mind",
  "Other",
];

const RETURN_CONDITIONS = ["good", "damaged"];

const RETURN_STATUSES = ["pending", "processed", "refunded"];

const EXPENSE_CATEGORIES = [
  "Product Purchase",
  "Delivery",
  "Packaging",
  "Marketing",
  "Facebook Ads",
  "Salary",
  "Rent",
  "Electricity",
  "Internet",
  "Hosting",
  "Website",
  "Office",
  "Transport",
  "Other",
];

const INCOME_CATEGORIES = [
  "Service Income",
  "Other Business Income",
  "Refund Received",
  "Miscellaneous",
];

const ACCOUNT_TYPES = ["Cash", "bKash", "Nagad", "Bank", "Card", "Other"];

const STOCK_MOVEMENT_TYPES = [
  "purchase",
  "sale",
  "return",
  "damage",
  "manual-increase",
  "manual-decrease",
  "adjustment",
];

const PAYMENT_TYPES = [
  "sale",
  "order",
  "purchase",
  "expense",
  "income",
  "customer-payment",
  "supplier-payment",
  "refund",
  "general",
];

const TARGET_TYPES = ["revenue", "orders", "products", "profit"];

const NOTIFICATION_TYPES = [
  "low-stock",
  "out-stock",
  "order",
  "payment",
  "due",
  "target",
  "return",
  "system",
];

module.exports = {
  ROLES,
  ROLE_PERMISSIONS,
  PRODUCT_CATEGORIES,
  SIZES,
  PANT_SIZES,
  PRODUCT_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  ORDER_STATUSES,
  ORDER_FLOW,
  RETURN_REASONS,
  RETURN_CONDITIONS,
  RETURN_STATUSES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  ACCOUNT_TYPES,
  STOCK_MOVEMENT_TYPES,
  PAYMENT_TYPES,
  TARGET_TYPES,
  NOTIFICATION_TYPES,
};