const mongoose = require("mongoose");

const path = require("path");

async function connectDB() {
  if (mongoose.connection.readyState !== 0) {
    console.log("[db] disconnecting stale connection (state %s)", mongoose.connection.readyState);
    await mongoose.disconnect();
  }
  const forceEmbedded = String(process.env.DB_MODE || "").toLowerCase() === "embedded";
  const uri = forceEmbedded ? "" : process.env.MONGODB_URI;

  if (!uri) {
    const { MongoMemoryReplSet } = require("mongodb-memory-server");
    const fs = require("fs");
    const dbPath = path.resolve(__dirname, "../../.mongo-data");
    if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });
    const port = Number(process.env.MONGO_EMBEDDED_PORT) || 27027;
    const mongod = await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
        storageEngine: "wiredTiger",
        name: "lunor-rs0",
      },
      instanceOpts: [{ dbName: "lunor_business", dbPath, port, ip: "127.0.0.1" }],
      binary: undefined,
    });
    global.__MONGO_MEMORY__ = mongod;
    await mongoose.connect(mongod.getUri("lunor_business"));
    return;
  }

  mongoose.set("strictQuery", true);
  const conn = await mongoose.connect(uri);
  console.log(`[db] MongoDB connected: ${conn.connection.host}`);
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (global.__MONGO_MEMORY__) {
    await global.__MONGO_MEMORY__.stop();
  }
}

async function runInTransaction(fn) {
  const session = await mongoose.startSession();
  let result;
  try {
    session.startTransaction();
    result = await fn(session);
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
  return result;
}

module.exports = { connectDB, disconnectDB, runInTransaction };