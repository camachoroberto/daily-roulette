import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse"
import { requireRoomSession } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    if (!slug) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "Slug é obrigatório"),
        { status: 400 }
      )
    }

    // Buscar a sala (sem o hash da senha)
    const room = await db.room.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            participants: true,
            spinHistory: true,
          },
        },
      },
    })

    if (!room) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "Sala não encontrada"),
        { status: 404 }
      )
    }

    return NextResponse.json(successResponse(room))
  } catch (error) {
    console.error("Erro ao buscar sala:", error)
    const errorResponse = handleApiError(error)
    const statusCode = error instanceof Error && "statusCode" in error 
      ? (error as any).statusCode 
      : 500
    return NextResponse.json(errorResponse, { status: statusCode })
  }
}

export async function DELETE(
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

    // Deletar a sala (cascade delete vai remover participantes e histórico)
    await db.room.delete({
      where: { id: room.id },
    })

    return NextResponse.json(successResponse({ ok: true }))
  } catch (error) {
    console.error("Erro ao deletar sala:", error)
    const errorResponse = handleApiError(error)
    const statusCode = error instanceof Error && "statusCode" in error
      ? (error as any).statusCode
      : 500
    return NextResponse.json(errorResponse, { status: statusCode })
  }
}
