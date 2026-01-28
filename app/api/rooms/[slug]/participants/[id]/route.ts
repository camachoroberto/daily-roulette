import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse"
import { requireRoomSession } from "@/lib/auth"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const { slug, id } = params

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

    // Buscar participante
    const participant = await db.participant.findUnique({
      where: { id },
      select: { id: true, roomId: true, isPresent: true },
    })

    if (!participant) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "Participante não encontrado"),
        { status: 404 }
      )
    }

    if (participant.roomId !== room.id) {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Participante não pertence a esta sala"),
        { status: 403 }
      )
    }

    // Toggle presence
    const updated = await db.participant.update({
      where: { id },
      data: {
        isPresent: !participant.isPresent,
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

    return NextResponse.json(successResponse(updated))
  } catch (error) {
    console.error("Erro ao atualizar participante:", error)
    const errorResponse = handleApiError(error)
    const statusCode = error instanceof Error && "statusCode" in error
      ? (error as any).statusCode
      : 500
    return NextResponse.json(errorResponse, { status: statusCode })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const { slug, id } = params

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

    // Buscar participante
    const participant = await db.participant.findUnique({
      where: { id },
      select: { id: true, roomId: true },
    })

    if (!participant) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "Participante não encontrado"),
        { status: 404 }
      )
    }

    if (participant.roomId !== room.id) {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "Participante não pertence a esta sala"),
        { status: 403 }
      )
    }

    // Deletar participante
    await db.participant.delete({
      where: { id },
    })

    return NextResponse.json(successResponse({ ok: true }))
  } catch (error) {
    console.error("Erro ao deletar participante:", error)
    const errorResponse = handleApiError(error)
    const statusCode = error instanceof Error && "statusCode" in error
      ? (error as any).statusCode
      : 500
    return NextResponse.json(errorResponse, { status: statusCode })
  }
}
