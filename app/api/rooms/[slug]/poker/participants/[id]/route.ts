import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse"
import { requireRoomSession } from "@/lib/auth"

const updatePokerEnabledSchema = z.object({
  pokerEnabled: z.boolean(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const { slug, id: participantId } = params

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
    const validationResult = updatePokerEnabledSchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(", ")
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", errors),
        { status: 400 }
      )
    }

    const { pokerEnabled } = validationResult.data

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

    // Atualizar flag
    const updated = await db.participant.update({
      where: { id: participantId },
      data: { pokerEnabled },
      select: {
        id: true,
        name: true,
        pokerEnabled: true,
      },
    })

    return NextResponse.json(successResponse(updated))
  } catch (error) {
    console.error("Erro ao atualizar pokerEnabled:", error)
    const errorResponse = handleApiError(error)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
