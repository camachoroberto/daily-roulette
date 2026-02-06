import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse"
import { requireRoomSession } from "@/lib/auth"

const revealRoundSchema = z.object({
  roundId: z.string().min(1, "RoundId é obrigatório"),
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
    const validationResult = revealRoundSchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(", ")
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", errors),
        { status: 400 }
      )
    }

    const { roundId } = validationResult.data

    // Verificar se a rodada existe e pertence à sala
    const round = await db.pokerRound.findFirst({
      where: {
        id: roundId,
        roomId: room.id,
      },
      include: {
        votes: {
          select: {
            participantId: true,
          },
        },
      },
    })

    if (!round) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "Rodada não encontrada"),
        { status: 404 }
      )
    }

    // Verificar se já foi revelada
    if (round.status === "REVEALED") {
      return NextResponse.json(
        successResponse({ success: true, alreadyRevealed: true })
      )
    }

    // Buscar participantes elegíveis
    const eligibleParticipants = await db.participant.findMany({
      where: {
        roomId: room.id,
        pokerEnabled: true,
      },
      select: {
        id: true,
      },
    })

    // Verificar se todos os elegíveis votaram
    const votedParticipantIds = new Set(round.votes.map((v) => v.participantId))
    const allVoted = eligibleParticipants.every((p) => votedParticipantIds.has(p.id))

    if (!allVoted) {
      return NextResponse.json(
        errorResponse("INCOMPLETE_VOTES", "Nem todos os participantes elegíveis votaram"),
        { status: 400 }
      )
    }

    // Atualizar status da rodada
    await db.pokerRound.update({
      where: { id: roundId },
      data: { status: "REVEALED" },
    })

    return NextResponse.json(successResponse({ success: true }))
  } catch (error) {
    console.error("Erro ao revelar rodada:", error)
    const errorResponse = handleApiError(error)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
