import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse"
import { requireRoomSession } from "@/lib/auth"
import { resolveImpedimentSchema } from "@/lib/validations"
import { getTodayLocal, dateStringToUtcStartOfDay } from "@/lib/dateUtils"

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

    const body = await request.json()
    const validationResult = resolveImpedimentSchema.safeParse(body)
    if (!validationResult.success) {
      const msg = validationResult.error.errors.map((e) => e.message).join(", ")
      return NextResponse.json(errorResponse("VALIDATION_ERROR", msg), { status: 400 })
    }

    const { participantId } = validationResult.data

    const participant = await db.participant.findFirst({
      where: { id: participantId, roomId: room.id },
      select: { id: true },
    })
    if (!participant) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "Participante não encontrado"),
        { status: 404 }
      )
    }

    const activeImpediment = await db.impediment.findFirst({
      where: {
        roomId: room.id,
        participantId,
        resolvedAt: null,
        status: { in: ["YELLOW", "RED"] },
      },
      orderBy: { date: "desc" },
    })

    if (!activeImpediment) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "Nenhum impedimento ativo para este participante"),
        { status: 404 }
      )
    }

    const now = new Date()
    const todayStr = getTodayLocal()
    const date = dateStringToUtcStartOfDay(todayStr)

    await db.$transaction([
      db.impediment.update({
        where: { id: activeImpediment.id },
        data: { resolvedAt: now },
      }),
      db.impediment.upsert({
        where: {
          participantId_date: { participantId, date },
        },
        create: {
          roomId: room.id,
          participantId,
          status: "GREEN",
          description: null,
          date,
        },
        update: { status: "GREEN", description: null },
      }),
    ])

    return NextResponse.json(successResponse({ ok: true }))
  } catch (err) {
    console.error("Erro ao resolver impedimento:", err)
    const res = handleApiError(err)
    const statusCode =
      err instanceof Error && "statusCode" in err ? (err as { statusCode: number }).statusCode : 500
    return NextResponse.json(res, { status: statusCode })
  }
}
