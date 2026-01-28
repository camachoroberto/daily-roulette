import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse"
import { requireRoomSession } from "@/lib/auth"
import { createNoPresentParticipantsError } from "@/lib/errors"

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

    // Buscar participantes presentes
    const presentParticipants = await db.participant.findMany({
      where: {
        roomId: room.id,
        isPresent: true,
      },
      select: {
        id: true,
        name: true,
        winCount: true,
      },
    })

    if (presentParticipants.length === 0) {
      return NextResponse.json(
        errorResponse("NO_PRESENT_PARTICIPANTS", "Não há participantes presentes para sortear"),
        { status: 400 }
      )
    }

    // Escolher vencedor aleatoriamente (uniforme)
    const randomIndex = Math.floor(Math.random() * presentParticipants.length)
    const winner = presentParticipants[randomIndex]

    // Criar histórico e incrementar winCount em transação
    const result = await db.$transaction(async (tx) => {
      // Criar registro no histórico
      const spinHistory = await tx.spinHistory.create({
        data: {
          roomId: room.id,
          participantId: winner.id,
        },
        include: {
          participant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      // Incrementar winCount
      const updatedParticipant = await tx.participant.update({
        where: { id: winner.id },
        data: {
          winCount: {
            increment: 1,
          },
        },
        select: {
          id: true,
          name: true,
          isPresent: true,
          winCount: true,
        },
      })

      return {
        winner: {
          id: updatedParticipant.id,
          name: updatedParticipant.name,
          winCount: updatedParticipant.winCount,
        },
        spinHistory: {
          id: spinHistory.id,
          participantId: spinHistory.participantId,
          createdAt: spinHistory.createdAt,
          participant: spinHistory.participant,
        },
      }
    })

    return NextResponse.json(successResponse(result))
  } catch (error) {
    console.error("Erro ao sortear:", error)
    const errorResponse = handleApiError(error)
    const statusCode = error instanceof Error && "statusCode" in error
      ? (error as any).statusCode
      : 500
    return NextResponse.json(errorResponse, { status: statusCode })
  }
}
