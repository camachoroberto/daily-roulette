import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { successResponse, errorResponse, handleApiError, getHttpStatusForErrorResponse } from "@/lib/apiResponse"

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50", 10)

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

    // Buscar histórico
    const history = await db.spinHistory.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100), // Máximo 100
      include: {
        participant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(successResponse(history))
  } catch (error) {
    console.error("Erro ao buscar histórico:", error)
    const err = handleApiError(error)
    return NextResponse.json(err, { status: getHttpStatusForErrorResponse(err) })
  }
}
