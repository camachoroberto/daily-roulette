import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { successResponse, errorResponse, handleApiError, getHttpStatusForErrorResponse } from "@/lib/apiResponse"
import { requireRoomSession } from "@/lib/auth"
import { isBirthdayToday } from "@/lib/birthday"

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

    let forcedParticipantId: string | undefined
    try {
      const text = await request.text()
      if (text?.trim()) {
        const body = JSON.parse(text) as { forcedParticipantId?: string }
        if (typeof body.forcedParticipantId === "string" && body.forcedParticipantId) {
          forcedParticipantId = body.forcedParticipantId
        }
      }
    } catch {
      forcedParticipantId = undefined
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
        birthdayDisplay: true,
      },
    })

    if (presentParticipants.length === 0) {
      return NextResponse.json(
        errorResponse("NO_PRESENT_PARTICIPANTS", "Não há participantes presentes para sortear"),
        { status: 400 }
      )
    }

    let winner: (typeof presentParticipants)[number]

    if (forcedParticipantId) {
      const forced = presentParticipants.find((p) => p.id === forcedParticipantId)
      if (!forced) {
        return NextResponse.json(
          errorResponse("NOT_FOUND", "Participante não encontrado ou não está presente"),
          { status: 404 }
        )
      }
      if (!isBirthdayToday(forced.birthdayDisplay)) {
        return NextResponse.json(
          errorResponse("FORBIDDEN", "Sorteio forçado só é permitido para aniversariante do dia"),
          { status: 403 }
        )
      }
      winner = forced
    } else {
      // Escolher vencedor aleatoriamente (uniforme)
      const randomIndex = Math.floor(Math.random() * presentParticipants.length)
      winner = presentParticipants[randomIndex]
    }

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
    const err = handleApiError(error)
    return NextResponse.json(err, { status: getHttpStatusForErrorResponse(err) })
  }
}
