import { PrismaClient } from "@prisma/client";
import { withDbRetry } from "@/lib/db-retry";

/**
 * Singleton do PrismaClient para ambiente serverless (ex: Vercel).
 * Evita criar múltiplas instâncias a cada invocação e estourar o limite de conexões.
 * Chamadas ao banco passam por retry automático (até 2 tentativas) em falha de conexão.
 *
 * Variáveis de ambiente (configurar na Vercel):
 * - DATABASE_URL (obrigatório): connection string do Postgres (Supabase, Neon, etc.).
 *   Ex.: postgresql://postgres.[project_ref]:[password]@aws-0-xx.pooler.supabase.com:6543/postgres
 * - DIRECT_URL (opcional): só necessário se usar Prisma com connection pooler e migrations;
 *   no schema.prisma use: url = env("DATABASE_URL"), directUrl = env("DIRECT_URL")
 */

function createRetryProxy<T extends object>(target: T): T {
  const handler: ProxyHandler<T> = {
    get(t, prop, receiver) {
      const val = Reflect.get(t, prop, receiver) as unknown;
      if (val === null || val === undefined) return val;
      if (typeof val === "function") {
        return function (...args: unknown[]) {
          return withDbRetry(() =>
            (val as (...a: unknown[]) => Promise<unknown>).apply(t, args)
          );
        };
      }
      if (
        typeof val === "object" &&
        !(val instanceof Date) &&
        !(val instanceof Promise)
      ) {
        return createRetryProxy(val as object);
      }
      return val;
    },
  };
  return new Proxy(target, handler) as T;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const rawPrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = rawPrisma;
}

/** Cliente Prisma com retry automático (até 2 tentativas) em falha de conexão. */
const prisma = createRetryProxy(rawPrisma);

export { prisma };
export type { PrismaClient };
