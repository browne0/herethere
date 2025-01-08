import { PrismaClient } from '@prisma/client';

const getDatabaseUrl = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  // Ensure we use the correct database URL based on environment
  if (process.env.NODE_ENV === 'production') {
    return process.env.DATABASE_URL;
  }

  // For development and testing, use the development branch
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
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn', 'info'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
