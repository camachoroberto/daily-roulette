/**
 * Cliente de banco (Prisma). Re-exporta o singleton de @/lib/prisma
 * para não quebrar imports existentes (todos usam "@/lib/db").
 */
import { prisma } from "@/lib/prisma";

export const db = prisma;
