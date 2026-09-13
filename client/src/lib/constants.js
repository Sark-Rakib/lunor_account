export const ROLES = ["admin", "manager", "accountant", "staff"];

export const ROLE_LABELS = {
  admin: "Administrator",
  manager: "Manager",
  accountant: "Accountant",
  staff: "Staff",
};

export const PRODUCT_CATEGORIES = [
  "Formal Shirt",
  "Casual Shirt",
  "T-Shirt",
  "Pant",
  "Panjabi",
  "Baggy",
  "Bag",
  "Other",
];

export const SIZES = ["S", "M", "L", "XL", "2XL"];
export const PANT_SIZES = ["28", "30", "32", "34", "36"];
export const PRODUCT_STATUS = ["active", "archived"];

export const PAYMENT_METHODS = ["Cash", "bKash", "Nagad", "Bank", "Card", "Other"];
export const PAYMENT_STATUS = ["paid", "partial", "unpaid"];
export const PAYMENT_STATUS_LABELS = { paid: "Paid", partial: "Partial", unpaid: "Unpaid" };
export const ACCOUNT_TYPES = ["Cash", "bKash", "Nagad", "Bank", "Card", "Other"];

export const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
  "Returned",
  "Refunded",
];

export const ORDER_FLOW = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered"];

export const RETURN_REASONS = [
  "Size issue",
  "Damaged",
  "Wrong product",
  "Customer changed mind",
  "Other",
];

export const RETURN_CONDITIONS = ["good", "damaged"];
export const RETURN_STATUSES = ["pending", "processed", "refunded"];
export const RETURN_STATUS_LABELS = { pending: "Pending", processed: "Processed", refunded: "Refunded" };

export const EXPENSE_CATEGORIES = [
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

export const INCOME_CATEGORIES = [
  "Service Income",
  "Other Business Income",
  "Refund Received",
  "Miscellaneous",
];

export const STOCK_MOVEMENT_TYPES = [
  "purchase",
  "sale",
  "return",
  "damage",
  "manual-increase",
  "manual-decrease",
  "adjustment",
];

export const TARGET_TYPES = ["revenue", "orders", "products", "profit"];
export const TARGET_TYPE_LABELS = { revenue: "Revenue", orders: "Orders", products: "Products", profit: "Profit" };
export const TARGET_PERIODS = ["monthly", "weekly", "yearly"];
export const TARGET_PERIOD_LABELS = { monthly: "Monthly", weekly: "Weekly", yearly: "Yearly" };

export const NOTIFICATION_TYPES = [
  "low-stock",
  "out-stock",
  "order",
  "payment",
  "due",
  "target",
  "return",
  "system",
];

export const SALES_STATUSES = ["completed", "cancelled"];
export const SALES_STATUS_LABELS = { completed: "Completed", cancelled: "Cancelled" };

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard", section: "General" },
  { href: "/sales", label: "Sales", icon: "ShoppingCart", section: "Sales" },
  { href: "/orders", label: "Orders", icon: "Package", section: "Sales" },
  { href: "/returns", label: "Returns", icon: "RotateCcw", section: "Sales" },
  { href: "/products", label: "Products", icon: "Shirt", section: "Inventory" },
  { href: "/purchases", label: "Purchases", icon: "Truck", section: "Inventory" },
  { href: "/customers", label: "Customers", icon: "Users", section: "Contacts" },
  { href: "/suppliers", label: "Suppliers", icon: "Store", section: "Contacts" },
  { href: "/expenses", label: "Expenses", icon: "CreditCard", section: "Accounting" },
  { href: "/income", label: "Income", icon: "HandCoins", section: "Accounting" },
  { href: "/accounts", label: "Accounts & Payments", icon: "Wallet", section: "Accounting" },
  { href: "/targets", label: "Targets", icon: "Target", section: "Management" },
  { href: "/reports", label: "Reports", icon: "BarChart3", section: "Management" },
  { href: "/notifications", label: "Notifications", icon: "Bell", section: "Management" },
  { href: "/activity", label: "Activity Log", icon: "History", section: "Management" },
];

export const APP_NAME = "LUNOR Business Manager";