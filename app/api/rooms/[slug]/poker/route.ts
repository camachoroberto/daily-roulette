import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { successResponse, errorResponse, handleApiError, getHttpStatusForErrorResponse } from "@/lib/apiResponse"
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

    // Verificar autenticação
    const session = await requireRoomSession(request, room.id)
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHORIZED", "Sessão inválida ou expirada"),
        { status: 401 }
      )
    }

    // Buscar ou criar rodada atual
    let currentRound = await db.pokerRound.findFirst({
      where: { roomId: room.id },
      orderBy: { createdAt: "desc" },
      include: {
        votes: {
          select: {
            participantId: true,
            value: true,
          },
        },
      },
    })

    // Se não existe rodada, criar uma nova
    if (!currentRound) {
      currentRound = await db.pokerRound.create({
        data: {
          roomId: room.id,
          status: "VOTING",
        },
        include: {
          votes: {
            select: {
              participantId: true,
              value: true,
            },
          },
        },
      })
    }

    // Buscar participantes
    const participants = await db.participant.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        pokerEnabled: true,
        isPresent: true,
      },
    })

    // Filtrar participantes elegíveis (pokerEnabled = true)
    const eligibleParticipants = participants.filter((p) => p.pokerEnabled)

    // Criar mapa de votos por participante
    const votesMap = new Map(
      currentRound.votes.map((v) => [v.participantId, v.value])
    )

    // Criar resumo de votos (sem revelar valores se status = VOTING)
    const voteSummary = eligibleParticipants.map((p) => ({
      participantId: p.id,
      hasVoted: votesMap.has(p.id),
      value: currentRound.status === "REVEALED" ? votesMap.get(p.id) || null : undefined,
    }))

    return NextResponse.json(
      successResponse({
        round: {
          id: currentRound.id,
          status: currentRound.status,
          createdAt: currentRound.createdAt.toISOString(),
        },
        participants,
        voteSummary,
        eligibleCount: eligibleParticipants.length,
      })
    )
  } catch (error) {
    console.error("Erro ao buscar estado do poker:", error)
    const err = handleApiError(error)
    return NextResponse.json(err, { status: getHttpStatusForErrorResponse(err) })
  }
}
