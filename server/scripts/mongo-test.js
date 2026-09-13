const { MongoMemoryServer } = require('mongodb-memory-server');
(async () => {
  const mongod = await MongoMemoryServer.create();
  console.log('MONGO_URI:', mongod.getUri());
  await mongod.stop();
  console.log('DONE');
})().catch(e => { console.error(e.message); process.exit(1); });
