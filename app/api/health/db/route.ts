import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Health check do banco de dados.
 * Executa SELECT 1 para validar conexão. Retorna 200 se OK, 503 se indisponível.
 * Nunca retorna 500 genérico.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true, database: "connected" }, { status: 200 })
  } catch {
    return NextResponse.json(
      { ok: false, database: "unavailable" },
      { status: 503 }
    )
  }
}
