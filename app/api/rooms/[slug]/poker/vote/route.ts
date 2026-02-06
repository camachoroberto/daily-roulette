import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse"
import { requireRoomSession } from "@/lib/auth"

const validVoteValues = ["0", "1", "2", "3", "5", "8", "13", "21", "34", "☕"]

const castVoteSchema = z.object({
  roundId: z.string().min(1, "RoundId é obrigatório"),
  participantId: z.string().min(1, "Participante é obrigatório"),
  sessionId: z.string().min(1, "SessionId é obrigatório"),
  value: z.string().refine(
    (val) => validVoteValues.includes(val),
    "Valor de voto inválido"
  ),
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
    const errorResponse = handleApiError(error)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
