import './env.ts';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export function getDatabaseErrorMessage(error: any): string {
  const errMsg = String(error?.message || error || '');
  const errCause = error?.cause;
  const causeMsg = String(errCause?.message || errCause || '');
  const errCode = String(error?.code || errCause?.code || '');
  
  if (errCode === 'ENOTFOUND' || errMsg.includes('ENOTFOUND') || causeMsg.includes('ENOTFOUND')) {
    return 'Database connection failed: The Turso database domain could not be resolved. Please check your internet connection or check if your DNS server is blocking Turso.';
  }
  
  if (errCode === 'UND_ERR_CONNECT_TIMEOUT' || errMsg.includes('timeout') || causeMsg.includes('timeout') || errMsg.includes('Timeout') || causeMsg.includes('Timeout')) {
    return 'Database connection timeout: Unable to reach the Turso database server. Please check your internet connection and ensure Turso is not experiencing downtime.';
  }
  
  if (errMsg.includes('fetch failed') || causeMsg.includes('fetch failed')) {
    return 'Database connection failed: The serverless database client failed to make a network request to Turso. Please ensure your internet connection is active.';
  }
  
  return 'Database error: ' + (error?.message || 'An unexpected database error occurred.');
}

