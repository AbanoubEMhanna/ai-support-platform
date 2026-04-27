import { PrismaClient, Prisma } from '@prisma/client';
import { withOrgScopeGuard } from './org-scope';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export const guardedPrisma = withOrgScopeGuard(prisma);

export type AppPrismaClient = typeof prisma;
export type GuardedPrismaClient = typeof guardedPrisma;
export { Prisma };
