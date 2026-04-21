import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { successResponse, errorResponse, handleApiError, getHttpStatusForErrorResponse } from "@/lib/apiResponse"
import { requireRoomSession } from "@/lib/auth"

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

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

    const currentRound = await db.pokerRound.findFirst({
      where: { roomId: room.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true },
    })

    if (!currentRound) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "Nenhuma rodada encontrada"),
        { status: 404 }
      )
    }

    if (currentRound.status === "REVEALED") {
      return NextResponse.json(
        errorResponse("INVALID_STATE", "Crie uma nova rodada antes de iniciar a votação"),
        { status: 400 }
      )
    }

    if (currentRound.status === "VOTING") {
      return NextResponse.json(successResponse({ success: true, alreadyVoting: true }))
    }

    const round = await db.pokerRound.update({
      where: { id: currentRound.id },
      data: { status: "VOTING" },
      select: { id: true, status: true, createdAt: true },
    })

    return NextResponse.json(
      successResponse({
        round: {
          id: round.id,
          status: round.status,
          createdAt: round.createdAt.toISOString(),
        },
      })
    )
  } catch (error) {
    const err = handleApiError(error)
    return NextResponse.json(err, { status: getHttpStatusForErrorResponse(err) })
  }
}
