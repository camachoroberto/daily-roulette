import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse"
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

    // Criar nova rodada
    const newRound = await db.pokerRound.create({
      data: {
        roomId: room.id,
        status: "VOTING",
      },
    })

    // Aplicar retenção: manter apenas as últimas 30 rodadas
    const allRounds = await db.pokerRound.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    })

    if (allRounds.length > 30) {
      const roundsToDelete = allRounds.slice(30)
      const idsToDelete = roundsToDelete.map((r) => r.id)

      // Deletar rodadas antigas (cascade apaga os votos)
      await db.pokerRound.deleteMany({
        where: {
          id: { in: idsToDelete },
        },
      })
    }

    return NextResponse.json(
      successResponse({
        round: {
          id: newRound.id,
          status: newRound.status,
          createdAt: newRound.createdAt.toISOString(),
        },
      })
    )
  } catch (error) {
    console.error("Erro ao criar nova rodada:", error)
    const errorResponse = handleApiError(error)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
