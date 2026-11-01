import dotenv from 'dotenv';
dotenv.config();

import { basePrisma, connectDatabase, disconnectDB } from '../config/db.config.js';

const purgeDummyData = async () => {
  try {
    await connectDatabase();
    console.log('🧹 Purging non-admin dummy users and audit logs from PostgreSQL...');

    const adminEmail = (process.env.ADMIN_EMAIL || 'asrafali444u@gmail.com').toLowerCase();

    await basePrisma.auditLog.deleteMany();
    await basePrisma.userLoginHistory.deleteMany();
    await basePrisma.user.deleteMany({
      where: {
        email: { not: adminEmail }
      }
    });

    console.log('✅ Clean-up complete. Super Admin account and Roles preserved.');
    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('❌ Purge failed:', error);
    await disconnectDB();
    process.exit(1);
  }
};

purgeDummyData();
