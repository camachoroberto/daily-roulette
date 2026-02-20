import { PrismaClient } from "@prisma/client";

/**
 * Singleton do PrismaClient para ambiente serverless (ex: Vercel).
 * Evita criar múltiplas instâncias a cada invocação e estourar o limite de conexões.
 *
 * Variáveis de ambiente (configurar na Vercel):
 * - DATABASE_URL (obrigatório): connection string do Postgres (Supabase, Neon, etc.).
 *   Ex.: postgresql://postgres.[project_ref]:[password]@aws-0-xx.pooler.supabase.com:6543/postgres
 * - DIRECT_URL (opcional): só necessário se usar Prisma com connection pooler e migrations;
 *   no schema.prisma use: url = env("DATABASE_URL"), directUrl = env("DIRECT_URL")
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { prisma };
export type { PrismaClient };
