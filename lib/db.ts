import { PrismaClient } from '@prisma/client';

const getDatabaseUrl = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('Database url is not set');
  }

  return process.env.DATABASE_URL;
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
