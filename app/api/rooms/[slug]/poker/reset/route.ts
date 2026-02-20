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

    // Verificar autenticação
    const session = await requireRoomSession(request, room.id)
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHORIZED", "Sessão inválida ou expirada"),
        { status: 401 }
      )
    }

    // Buscar rodada atual
    const currentRound = await db.pokerRound.findFirst({
      where: { roomId: room.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    })

    if (!currentRound) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "Nenhuma rodada encontrada"),
        { status: 404 }
      )
    }

    // Deletar todos os votos da rodada atual (cascade não funciona aqui, precisamos deletar manualmente)
    await db.pokerVote.deleteMany({
      where: { roundId: currentRound.id },
    })

    // Resetar status da rodada para VOTING (caso esteja REVEALED)
    await db.pokerRound.update({
      where: { id: currentRound.id },
      data: { status: "VOTING" },
    })

    return NextResponse.json(successResponse({ success: true }))
  } catch (error) {
    console.error("Erro ao reiniciar votação:", error)
    const err = handleApiError(error)
    return NextResponse.json(err, { status: getHttpStatusForErrorResponse(err) })
  }
}
