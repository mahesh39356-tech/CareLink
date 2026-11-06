import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to database successfully.');
  } catch (err) {
    console.error('❌ Failed to connect to database:', err);
    throw err;
  }
}
