import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { successResponse, errorResponse } from "@/lib/apiResponse"
import { requireRoomSession } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    // Buscar a sala
    const room = await db.room.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (!room) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "Sala não encontrada"),
        { status: 404 }
      )
    }

    // Verificar sessão
    const session = await requireRoomSession(request, room.id)
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHORIZED", "Sessão inválida ou expirada"),
        { status: 401 }
      )
    }

    return NextResponse.json(successResponse({ authenticated: true }))
  } catch (error) {
    console.error("Erro ao verificar sessão:", error)
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "Erro ao verificar sessão"),
      { status: 500 }
    )
  }
}
