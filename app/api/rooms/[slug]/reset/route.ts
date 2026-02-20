import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { successResponse, errorResponse, handleApiError, getHttpStatusForErrorResponse } from "@/lib/apiResponse"
import { requireRoomSession } from "@/lib/auth"

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    // Verificar autenticação
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

    const session = await requireRoomSession(request, room.id)
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHORIZED", "Sessão inválida ou expirada"),
        { status: 401 }
      )
    }

    // Executar reset em transação
    await db.$transaction(async (tx) => {
      // Deletar histórico
      await tx.spinHistory.deleteMany({
        where: { roomId: room.id },
      })

      // Zerar winCount de todos os participantes
      await tx.participant.updateMany({
        where: { roomId: room.id },
        data: { winCount: 0 },
      })
    })

    return NextResponse.json(successResponse({ ok: true }))
  } catch (error) {
    console.error("Erro ao resetar sala:", error)
    const err = handleApiError(error)
    return NextResponse.json(err, { status: getHttpStatusForErrorResponse(err) })
  }
}
