import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse"
import { requireRoomSession } from "@/lib/auth"

const claimParticipantSchema = z.object({
  participantId: z.string().min(1, "Participante é obrigatório"),
  sessionId: z.string().min(1, "SessionId é obrigatório"),
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
    const validationResult = claimParticipantSchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(", ")
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", errors),
        { status: 400 }
      )
    }

    const { participantId, sessionId } = validationResult.data

    // Verificar se o participante existe e pertence à sala
    const participant = await db.participant.findFirst({
      where: {
        id: participantId,
        roomId: room.id,
      },
    })

    if (!participant) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "Participante não encontrado"),
        { status: 404 }
      )
    }

    // Limpar claims expirados
    await db.participantClaim.deleteMany({
      where: {
        roomId: room.id,
        expiresAt: { lt: new Date() },
      },
    })

    // Verificar se existe claim válido com outro sessionId
    const existingClaim = await db.participantClaim.findUnique({
      where: {
        roomId_participantId: {
          roomId: room.id,
          participantId,
        },
      },
    })

    if (existingClaim) {
      // Se o claim expirou, podemos sobrescrever
      if (existingClaim.expiresAt < new Date()) {
        await db.participantClaim.delete({
          where: { id: existingClaim.id },
        })
      } else if (existingClaim.sessionId !== sessionId) {
        // Claim válido com outro sessionId
        return NextResponse.json(
          errorResponse("NAME_TAKEN", "Nome em uso nesta sala"),
          { status: 409 }
        )
      }
      // Se é o mesmo sessionId, atualizar expiresAt
    }

    // Criar ou atualizar claim
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 2) // 2 horas

    const claim = await db.participantClaim.upsert({
      where: {
        roomId_participantId: {
          roomId: room.id,
          participantId,
        },
      },
      create: {
        roomId: room.id,
        participantId,
        sessionId,
        expiresAt,
      },
      update: {
        sessionId,
        expiresAt,
      },
    })

    return NextResponse.json(
      successResponse({
        claim: {
          id: claim.id,
          expiresAt: claim.expiresAt.toISOString(),
        },
      })
    )
  } catch (error) {
    console.error("Erro ao fazer claim do participante:", error)
    const errorResponse = handleApiError(error)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
