import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mht_erp';

async function wipeProducts() {
  await mongoose.connect(MONGO_URI);
  console.log('[Mongo] Connected to:', MONGO_URI);
  
  const result = await mongoose.connection.db.collection('crmmasters').updateMany(
    {},
    { $set: { machines: [] } }
  );
  console.log('[CRM Masters] Updated documents count:', result.modifiedCount);

  const doc = await mongoose.connection.db.collection('crmmasters').findOne({});
  console.log('[CRM Masters] Machines remaining:', doc?.machines?.length ?? 0);

  await mongoose.connection.close();
  process.exit(0);
}

wipeProducts().catch((err) => {
  console.error('Error wiping products:', err);
  process.exit(1);
});
