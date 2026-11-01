import { PrismaClient } from '@prisma/client';

const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

/**
 * Extended Prisma Client:
 * 1. Automatically computes `_id` on all returned records for 100% frontend RTK Query compatibility.
 * 2. Enforces Strict User Deactivation Rule (blocks hard deletion of User accounts).
 * 3. Enforces Immutable Audit Log Rule (blocks update or deletion of AuditLog records).
 */
export const prisma = basePrisma.$extends({
  result: {
    $allModels: {
      _id: {
        needs: { id: true },
        compute(model) {
          return model.id;
        }
      }
    }
  },
  query: {
    user: {
      async delete() {
        throw new Error('Strict System Rule Violation: User accounts cannot be deleted. Deactivate the account instead.');
      },
      async deleteMany() {
        throw new Error('Strict System Rule Violation: User accounts cannot be deleted. Deactivate the account instead.');
      }
    },
    auditLog: {
      async update() {
        throw new Error('Security Block: Audit logs are immutable and cannot be updated.');
      },
      async updateMany() {
        throw new Error('Security Block: Audit logs are immutable and cannot be updated.');
      },
      async delete() {
        throw new Error('Security Block: Audit logs are immutable and cannot be deleted.');
      },
      async deleteMany() {
        throw new Error('Security Block: Audit logs are immutable and cannot be deleted.');
      }
    }
  }
});

export { basePrisma };

export const connectDB = async () => {
  try {
    await basePrisma.$connect();
    console.log('[Database] PostgreSQL Connected via Prisma ORM');
    return prisma;
  } catch (error) {
    console.error(`[Database Error] PostgreSQL connection failed: ${error.message}`);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  await basePrisma.$disconnect();
};

export const connectDatabase = connectDB;
