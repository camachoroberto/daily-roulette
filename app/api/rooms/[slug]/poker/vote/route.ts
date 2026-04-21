import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { successResponse, errorResponse, handleApiError, getHttpStatusForErrorResponse } from "@/lib/apiResponse"
import { requireRoomSession } from "@/lib/auth"
import { isValidVoteForScale, type PokerScale } from "@/lib/poker-utils"

const castVoteSchema = z.object({
  roundId: z.string().min(1, "RoundId é obrigatório"),
  participantId: z.string().min(1, "Participante é obrigatório"),
  sessionId: z.string().min(1, "SessionId é obrigatório"),
  value: z.string().min(1, "Valor é obrigatório"),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    // Buscar a sala
    const room = await db.room.findUnique({
      where: { slug },
      select: { id: true, pokerScale: true },
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

    // Validar body
    const body = await request.json()
    const validationResult = castVoteSchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(", ")
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", errors),
        { status: 400 }
      )
    }

    const { roundId, participantId, sessionId, value } = validationResult.data
    const scale = room.pokerScale as PokerScale

    if (!isValidVoteForScale(value, scale)) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "Valor de voto inválido para a escala atual"),
        { status: 400 }
      )
    }

    // Verificar se a rodada existe e pertence à sala
    const round = await db.pokerRound.findFirst({
      where: {
        id: roundId,
        roomId: room.id,
      },
    })

    if (!round) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "Rodada não encontrada"),
        { status: 404 }
      )
    }

    // Verificar se a rodada ainda está em VOTING
    if (round.status !== "VOTING") {
      return NextResponse.json(
        errorResponse("INVALID_STATE", "Rodada já foi revelada"),
        { status: 400 }
      )
    }

    // Validar claim
    const claim = await db.participantClaim.findUnique({
      where: {
        roomId_participantId: {
          roomId: room.id,
          participantId,
        },
      },
    })

    if (!claim || claim.sessionId !== sessionId || claim.expiresAt < new Date()) {
      return NextResponse.json(
        errorResponse("UNAUTHORIZED", "Claim inválido ou expirado"),
        { status: 401 }
      )
    }

    // Verificar se o participante está habilitado para poker
    const participant = await db.participant.findFirst({
      where: {
        id: participantId,
        roomId: room.id,
      },
    })

    if (!participant || !participant.pokerEnabled) {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Participante não está habilitado para poker"),
        { status: 403 }
      )
    }

    // Criar ou atualizar voto
    await db.pokerVote.upsert({
      where: {
        roundId_participantId: {
          roundId,
          participantId,
        },
      },
      create: {
        roundId,
        participantId,
        value,
      },
      update: {
        value,
      },
    })

    return NextResponse.json(successResponse({ success: true }))
  } catch (error) {
    console.error("Erro ao registrar voto:", error)
    const err = handleApiError(error)
    return NextResponse.json(err, { status: getHttpStatusForErrorResponse(err) })
  }
}
