import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Keepalive opcional: testa conexão com o banco (SELECT 1).
 * Útil para cron da Vercel ou monitoramento. Retorna 200 se OK, 503 se indisponível.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 })
  }
}
