import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { successResponse, errorResponse, handleApiError, getHttpStatusForErrorResponse } from "@/lib/apiResponse"
import { requireRoomSession } from "@/lib/auth"

const createParticipantSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
})

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

    // Buscar participantes
    const participants = await db.participant.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        isPresent: true,
        winCount: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(successResponse(participants))
  } catch (error) {
    console.error("Erro ao buscar participantes:", error)
    const err = handleApiError(error)
    return NextResponse.json(err, { status: getHttpStatusForErrorResponse(err) })
  }
}

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

    // Validar body
    const body = await request.json()
    const validationResult = createParticipantSchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(", ")
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", errors),
        { status: 400 }
      )
    }

    const { name } = validationResult.data

    // Criar participante
    const participant = await db.participant.create({
      data: {
        roomId: room.id,
        name: name.trim(),
        isPresent: true,
        winCount: 0,
      },
      select: {
        id: true,
        name: true,
        isPresent: true,
        winCount: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(successResponse(participant), { status: 201 })
  } catch (error) {
    console.error("Erro ao criar participante:", error)
    const err = handleApiError(error)
    return NextResponse.json(err, { status: getHttpStatusForErrorResponse(err) })
  }
}
