require("dotenv").config();
const mongoose = require("mongoose");
const dayjs = require("dayjs");
require("./utils/date");
const { connectDB, disconnectDB } = require("./config/db");
const BusinessSettings = require("./models/BusinessSettings");
const Account = require("./models/Account");
const User = require("./models/User");
const Supplier = require("./models/Supplier");
const Product = require("./models/Product");
const Customer = require("./models/Customer");
const Target = require("./models/Target");
const Counter = require("./models/Counter");
const { createPurchase } = require("./services/purchaseService");
const { createSale } = require("./services/saleService");
const { createOrder, updateOrderStatus } = require("./services/orderService");
const { createReturn } = require("./services/returnService");
const { createPayment, recomputeAccountBalances } = require("./services/accountingService");
const Expense = require("./models/Expense");
const incomeRecord = require("./models/Income");
const { PRODUCT_CATEGORIES } = require("./constants");

const tz = "Asia/Dhaka";

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randDate(daysAgoMin, daysAgoMax) {
  return dayjs()
    .tz(tz)
    .subtract(rand(daysAgoMin, daysAgoMax), "day")
    .hour(rand(9, 21))
    .minute(rand(0, 59))
    .toDate();
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

async function seed() {
  console.log("[seed] Connecting...");
  await connectDB();

  console.log("[seed] Clearing collections...");
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const c of collections) {
    await mongoose.connection.db.collection(c.name).deleteMany({});
  }

  const settings = await BusinessSettings.create({
    businessName: "LUNOR",
    tagline: "Business Manager",
    phone: "+880 1712 000000",
    email: "hello@lunor.store",
    address: "Dhanmondi, Dhaka, Bangladesh",
    currency: "BDT",
    currencySymbol: "৳",
    timezone: "Asia/Dhaka",
    registrationEnabled: false,
    orderSettings: { defaultStatus: "Pending", autoConfirm: true, autoDeductStockOnConfirm: true },
    invoicePrefix: "INV",
    orderPrefix: "ORD",
    purchasePrefix: "PUR",
    returnPrefix: "RET",
  });
  console.log("[seed] Settings:", settings.businessName);

  const accounts = await Account.create([
    { name: "Cash", type: "Cash", openingBalance: 25000, currentBalance: 25000, isDefault: true },
    { name: "bKash", type: "bKash", openingBalance: 18500, currentBalance: 18500 },
    { name: "Nagad", type: "Nagad", openingBalance: 12300, currentBalance: 12300 },
    { name: "Bank Account", type: "Bank", openingBalance: 45000, currentBalance: 45000 },
    { name: "Card", type: "Card", openingBalance: 10000, currentBalance: 10000 },
  ]);
  console.log("[seed] Accounts:", accounts.length);

  const admin = await User.create({
    name: "Admin",
    email: "admin@lunor.com",
    password: "admin123",
    phone: "+880 1700 000000",
    role: "admin",
    active: true,
  });
  const manager = await User.create({
    name: "Karim Manager",
    email: "manager@lunor.com",
    password: "manager123",
    phone: "+880 1700 000001",
    role: "manager",
    active: true,
  });
  const accountant = await User.create({
    name: "Ria Accountant",
    email: "accountant@lunor.com",
    password: "accountant123",
    phone: "+880 1700 000002",
    role: "accountant",
    active: true,
  });
  const staff = await User.create({
    name: "Staff User",
    email: "staff@lunor.com",
    password: "staff123",
    phone: "+880 1700 000003",
    role: "staff",
    active: true,
  });
  console.log("[seed] Users:", admin.email, "/", manager.email, "/", accountant.email, "/", staff.email);

  const suppliers = await Supplier.create([
    { name: "Dhaka Garments House", phone: "+880 1711 111111", email: "sales@dgh.com.bd", address: "Mirpur 10, Dhaka", company: "Dhaka Garments House" },
    { name: "Bashundhara Textiles", phone: "+880 1711 222222", email: "info@bt.com.bd", address: "Uttara, Dhaka", company: "Bashundhara Textiles" },
    { name: "Fashion Fabrics Ltd", phone: "+880 1711 333333", email: "contact@ffl.com.bd", address: "Gulshan, Dhaka", company: "Fashion Fabrics Ltd" },
    { name: "Tangail Panjabi House", phone: "+880 1711 444444", email: "tp@cottage.com", address: "Tangail", company: "Tangail Panjabi House" },
  ]);
  console.log("[seed] Suppliers:", suppliers.length);

  const productDefs = [
    { name: "Lunor Classic Formal Shirt", category: "Formal Shirt", sizes: ["S", "M", "L", "XL", "2XL"], cost: 780, price: 1450 },
    { name: "Lunor Slim Formal Shirt", category: "Formal Shirt", sizes: ["M", "L", "XL"], cost: 840, price: 1550 },
    { name: "Lunor Casual Check Shirt", category: "Casual Shirt", sizes: ["S", "M", "L", "XL"], cost: 640, price: 1250 },
    { name: "Lunor Linen Casual Shirt", category: "Casual Shirt", sizes: ["M", "L", "XL", "2XL"], cost: 720, price: 1400 },
    { name: "Lunor Premium Cotton T-Shirt", category: "T-Shirt", sizes: ["S", "M", "L", "XL", "2XL"], cost: 320, price: 650 },
    { name: "Lunor Graphic T-Shirt", category: "T-Shirt", sizes: ["M", "L", "XL"], cost: 380, price: 750 },
    { name: "Lunor Chino Pant", category: "Pant", sizes: ["28", "30", "32", "34", "36"], cost: 900, price: 1650 },
    { name: "Lunor Denim Pant", category: "Pant", sizes: ["30", "32", "34", "36"], cost: 1100, price: 1950 },
    { name: "Lunor Classic Panjabi", category: "Panjabi", sizes: ["M", "L", "XL", "2XL"], cost: 1250, price: 2100 },
    { name: "Lunor Premium Panjabi", category: "Panjabi", sizes: ["L", "XL", "2XL"], cost: 1600, price: 2600 },
    { name: "Lunor Baggy Cargo Pant", category: "Baggy", sizes: ["28", "30", "32", "34"], cost: 980, price: 1750 },
    { name: "Lunor Baggy Jeans", category: "Baggy", sizes: ["30", "32", "34"], cost: 1150, price: 2000 },
    { name: "Lunor Casual Backpack", category: "Bag", sizes: [], cost: 850, price: 1500 },
    { name: "Lunor Shoulder Sling Bag", category: "Bag", sizes: [], cost: 600, price: 1100 },
    { name: "Lunor Polo T-Shirt", category: "T-Shirt", sizes: ["S", "M", "L", "XL", "2XL"], cost: 420, price: 850 },
    { name: "Lunor Cargo Pant", category: "Pant", sizes: ["30", "32", "34", "36"], cost: 1050, price: 1850 },
    { name: "Lunor Kurta Panjabi", category: "Panjabi", sizes: ["M", "L", "XL"], cost: 1150, price: 1850 },
    { name: "Lunor Oversized Shirt", category: "Casual Shirt", sizes: ["S", "M", "L", "XL"], cost: 700, price: 1350 },
  ];

  let skuCounter = 1;
  const products = [];
  for (const def of productDefs) {
    const p = await Product.create({
      name: def.name,
      sku: `LNR-${String(skuCounter++).padStart(4, "0")}`,
      category: def.category,
      description: `Premium quality ${def.category.toLowerCase()} from LUNOR.`,
      purchasePrice: def.cost,
      sellingPrice: def.price,
      currentStock: 0,
      minimumStock: rand(4, 10),
      supplier: pick(suppliers)._id,
      sizes: def.sizes,
      status: "active",
    });
    products.push(p);
  }
  console.log("[seed] Products:", products.length);

  const firstNames = ["Rahim", "Karim", "Jabbar", "Selim", "Nazma", "Farida", "Tanvir", "Sabbir", "Mim", "Nusrat", "Tanjim", "Rafi", "Sadia", "Opu", "Shakil", "Lima", "Popy", "Milon"];
  const lastNames = ["Ahmed", "Khan", "Hossain", "Rahman", "Islam", "Uddin", "Chowdhury", "Sarker", "Das", "Biswas", "Sheikh", "Mia"];
  const customers = [];
  for (let i = 0; i < 14; i++) {
    const c = await Customer.create({
      name: `${pick(firstNames)} ${pick(lastNames)}`,
      phone: `+880 17${rand(10, 99999999).toString().padStart(9, "0")}`,
      email: `customer${i + 1}@gmail.com`,
      address: pick(["Dhanmondi, Dhaka", "Uttara, Dhaka", "Mohammadpur, Dhaka", "Mirpur, Dhaka", "Banani, Dhaka", "Khilgaon, Dhaka", "Gulshan, Dhaka"]),
      notes: "",
    });
    customers.push(c);
  }
  console.log("[seed] Customers:", customers.length);

  const adminUser = admin;

  console.log("[seed] Creating purchases...");
  for (let i = 0; i < 12; i++) {
    const supplier = pick(suppliers);
    const itemCount = rand(2, 5);
    const selected = [...products].sort(() => Math.random() - 0.5).slice(0, itemCount);
    const items = selected.map((p) => ({
      product: p._id,
      quantity: rand(15, 40),
      price: p.purchasePrice,
    }));
    const totalAmount = items.reduce((s, it) => s + it.quantity * it.price, 0);
    const paidAmount = Math.random() > 0.25 ? totalAmount : Number((totalAmount * rand(40, 80) / 100).toFixed(0));
    await createPurchase({
      body: {
        supplier: supplier._id,
        items,
        paidAmount,
        paymentMethod: pick(["Cash", "Cash", "bKash", "Bank"]),
        purchaseDate: randDate(85, 5),
        notes: "Initial stock purchase",
      },
      user: adminUser,
    });
  }

  const freshProducts = await Product.find({ status: "active" });
  products.length = 0;
  products.push(...freshProducts);

  console.log("[seed] Creating sales...");
  let sales = [];
  const productWithStock = () => products.filter((p) => p.currentStock > 2);
  for (let i = 0; i < 48; i++) {
    const available = productWithStock();
    if (!available.length) continue;
    const itemCount = rand(1, 3);
    const selected = [...available].sort(() => Math.random() - 0.5).slice(0, itemCount);
    const items = selected.map((p) => {
      const maxQty = Math.min(3, p.currentStock);
      return { product: p._id, quantity: rand(1, Math.max(1, maxQty)), sellingPrice: p.sellingPrice };
    });
    if (items.some((it) => it.quantity < 1)) continue;
    const customer = Math.random() > 0.25 ? pick(customers)._id : null;
    const discount = Math.random() > 0.75 ? rand(50, 200) : 0;
    const deliveryCharge = Math.random() > 0.5 ? rand(60, 120) : 0;
    const paidAmount = Math.random() > 0.15 ? 99999 : Math.floor(Number(items.reduce((s, it) => s + it.quantity, 0) * 500)); // mostly paid
    const sale = await createSale({
      body: {
        customer,
        items,
        discount,
        deliveryCharge,
        paymentMethod: pick(["Cash", "Cash", "bKash", "bKash", "Nagad", "Bank", "Card"]),
        paidAmount: paidAmount === 99999 ? null : paidAmount,
        saleDate: randDate(88, 0),
        notes: "",
      },
      user: adminUser,
    });
    sales.push(sale);
  }
  console.log("[seed] Sales:", sales.length);

  console.log("[seed] Creating orders...");
  const orders = [];
  for (let i = 0; i < 30; i++) {
    const available = productWithStock();
    if (!available.length) continue;
    const itemCount = rand(1, 3);
    const selected = [...available].sort(() => Math.random() - 0.5).slice(0, itemCount);
    const items = selected.map((p) => {
      const maxQty = Math.min(2, p.currentStock);
      return { product: p._id, quantity: rand(1, Math.max(1, maxQty)), sellingPrice: p.sellingPrice };
    });
    if (items.some((it) => it.quantity < 1)) continue;
    const statusRoll = Math.random();
    let status = "Pending";
    if (statusRoll < 0.15) status = "Pending";
    else if (statusRoll < 0.35) status = "Confirmed";
    else if (statusRoll < 0.55) status = "Processing";
    else if (statusRoll < 0.75) status = "Shipped";
    else status = "Delivered";
    const customer = pick(customers)._id;
    const paidAmount = status === "Pending" ? 0 : Math.random() > 0.3 ? 99999 : 0;
    const order = await createOrder({
      body: {
        customer,
        items,
        discount: Math.random() > 0.8 ? rand(50, 150) : 0,
        deliveryCharge: rand(60, 120),
        paymentMethod: pick(["Cash", "bKash", "Nagad", "Card"]),
        paidAmount: paidAmount === 99999 ? null : paidAmount,
        orderStatus: status,
        orderDate: randDate(60, 0),
        notes: "Online store order",
      },
      user: adminUser,
    });
    orders.push(order);
  }
  console.log("[seed] Orders:", orders.length);

  console.log("[seed] Advancing some orders through the timeline...");
  const flowOrders = orders.filter((o) => ["Shipped", "Delivered"].includes(o.orderStatus));
  for (const o of flowOrders.slice(0, 4)) {
    if (o.orderStatus === "Shipped") {
      await updateOrderStatus(o._id, "Delivered", { user: adminUser, reason: "Order advanced for realistic timeline" });
    }
  }

  console.log("[seed] Creating returns...");
  const returnTargets = orders.filter((o) => o.orderStatus === "Delivered" && o.paidAmount > 0).slice(0, 2);
  for (const o of returnTargets) {
    const item = pick(o.items);
    await createReturn({
      body: {
        order: o._id,
        customer: o.customer,
        items: [{ product: item.product, quantity: 1, reason: "Size issue", condition: "good" }],
        reason: "Size issue",
        refundMethod: "bKash",
        refundStatus: "refunded",
        returnDate: dayjs().tz(tz).subtract(rand(1, 5), "day").toDate(),
        notes: "Customer returned for size exchange",
      },
      user: adminUser,
    });
  }

  console.log("[seed] Creating expenses...");
  const expenseDefs = [
    { category: "Marketing", titles: ["Facebook boost campaign", "Instagram sponsor", "Influencer promo"] },
    { category: "Facebook Ads", titles: ["Meta ads budget", "Retargeting ads"] },
    { category: "Delivery", titles: ["Pathao delivery fee", "Steadfast bulk shipping"] },
    { category: "Packaging", titles: ["Poly bags restock", "Gift boxes", "Sticker labels"] },
    { category: "Salary", titles: ["Staff salary", "Helper salary"] },
    { category: "Rent", titles: ["Showroom rent", "Market stall rent"] },
    { category: "Electricity", titles: ["Electricity bill", "Carwash light bill"] },
    { category: "Internet", titles: ["Broadband bill"] },
    { category: "Hosting", titles: ["Site hosting + domain"] },
    { category: "Website", titles: ["Website maintenance"] },
    { category: "Office", titles: ["Stationery", "Office supplies"] },
    { category: "Transport", titles: ["Local courier", "Fuel"] },
  ];
  for (let i = 0; i < 34; i++) {
    const def = pick(expenseDefs);
    const expenseDate = randDate(88, 0);
    const expense = await Expense.create({
      title: pick(def.titles),
      category: def.category,
      amount: rand(300, 9000),
      paymentMethod: pick(["Cash", "Cash", "bKash", "Bank"]),
      expenseDate,
      description: "Operational expense",
      createdBy: adminUser._id,
    });
    await createPayment({
      type: "expense",
      direction: "out",
      amount: expense.amount,
      method: expense.paymentMethod,
      referenceType: "Expense",
      reference: expense._id,
      description: `${expense.category}: ${expense.title}`,
      paymentDate: expenseDate,
      user: adminUser,
    });
  }
  console.log("[seed] Expenses: 34");

  console.log("[seed] Creating income records...");
  const incomes = [
    { title: "Photoshoot service income", category: "Service Income", amount: 12000 },
    { title: "Rent from second floor", category: "Other Business Income", amount: 8000 },
    { title: "Supplier refund received", category: "Refund Received", amount: 3500 },
    { title: "Affiliate commission", category: "Miscellaneous", amount: 1500 },
  ];
  for (const inc of incomes) {
    const incomeDate = randDate(70, 2);
    const income = await incomeRecord.create({
      title: inc.title,
      category: inc.category,
      amount: inc.amount,
      paymentMethod: "Bank",
      incomeDate,
      notes: "Other income",
      createdBy: adminUser._id,
    });
    await createPayment({
      type: "income",
      direction: "in",
      amount: inc.amount,
      method: "Bank",
      referenceType: "Income",
      reference: income._id,
      description: `${inc.category}: ${inc.title}`,
      paymentDate: incomeDate,
      user: adminUser,
    });
  }
  console.log("[seed] Income: 4");

  console.log("[seed] Creating targets...");
  const actual = await require("./services/finance").summaryInRange(dayjs().tz(tz).startOf("month").toDate(), dayjs().tz(tz).endOf("month").toDate());
  await Target.create({
    month: dayjs().tz(tz).format("YYYY-MM"),
    revenueTarget: Math.round(actual.revenue * 1.25),
    orderTarget: Math.max(Math.round(actual.ordersCount * 1.3), 30),
    productSalesTarget: Math.max(Math.round(actual.soldQuantity * 1.2), 100),
    profitTarget: Math.max(Math.round(actual.netProfit * 1.3), 100000),
  });
  await Target.create({
    month: dayjs().tz(tz).subtract(1, "month").format("YYYY-MM"),
    revenueTarget: rand(200000, 280000),
    orderTarget: rand(30, 50),
    productSalesTarget: rand(120, 200),
    profitTarget: rand(60000, 100000),
  });

  console.log("[seed] Recomputing account balances...");
  await recomputeAccountBalances();

  console.log("");
  console.log("[seed] === DONE ===");
  console.log("[seed] Login credentials (development only):");
  console.log("[seed]   admin@lunor.com / admin123");
  console.log("[seed]   manager@lunor.com / manager123");
  console.log("[seed]   accountant@lunor.com / accountant123");
  console.log("[seed]   staff@lunor.com / staff123");

  await disconnectDB();
  process.exit(0);
}

seed().catch((err) => {
  console.error("[seed] FAILED:", err);
  process.exit(1);
});