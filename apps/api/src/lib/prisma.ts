import { PrismaPg } from '@prisma/adapter-pg';

import { type Prisma, PrismaClient } from '../generated/prisma/client.js';

export type Db = PrismaClient;
/** Klient použitelný uvnitř i mimo interaktivní transakci. */
export type DbClient = PrismaClient | Prisma.TransactionClient;

export function createPrismaClient(databaseUrl: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}
