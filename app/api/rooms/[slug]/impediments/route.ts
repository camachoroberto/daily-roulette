import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse"
import { requireRoomSession } from "@/lib/auth"
import { upsertImpedimentSchema } from "@/lib/validations"
import { getTodayLocal, dateStringToUtcStartOfDay, getYesterdayLocal } from "@/lib/dateUtils"

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get("date") ?? getTodayLocal()

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

    const date = dateStringToUtcStartOfDay(dateStr)
    const yesterdayStr = getYesterdayLocal()
    const yesterday = dateStringToUtcStartOfDay(yesterdayStr)

    const todayImpediments = await db.impediment.findMany({
      where: { roomId: room.id, date },
      select: {
        id: true,
        participantId: true,
        status: true,
        description: true,
      },
    })

    const previousDayActive = await db.impediment.findMany({
      where: {
        roomId: room.id,
        date: yesterday,
        resolvedAt: null,
        status: { in: ["YELLOW", "RED"] },
      },
      select: {
        id: true,
        participantId: true,
        status: true,
        description: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      successResponse({
        todayByParticipant: todayImpediments.reduce<
          Record<string, { id: string; status: string; description: string | null }>
        >((acc, i) => {
          acc[i.participantId] = {
            id: i.id,
            status: i.status,
            description: i.description ?? null,
          }
          return acc
        }, {}),
        previousDayActive: previousDayActive.map((i) => ({
          id: i.id,
          participantId: i.participantId,
          status: i.status,
          description: i.description ?? null,
          createdAt: i.createdAt,
        })),
      })
    )
  } catch (error) {
    console.error("Erro ao buscar impedimentos:", error)
    const err = handleApiError(error)
    return NextResponse.json(err, { status: 500 })
  }
}

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
    const validationResult = upsertImpedimentSchema.safeParse(body)
    if (!validationResult.success) {
      const msg = validationResult.error.errors.map((e) => e.message).join(", ")
      return NextResponse.json(errorResponse("VALIDATION_ERROR", msg), { status: 400 })
    }

    const { participantId, status, description } = validationResult.data
    const descriptionTruncated = description == null ? null : description.slice(0, 100)
    const dateStr = getTodayLocal()
    const date = dateStringToUtcStartOfDay(dateStr)

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

    const impediment = await db.impediment.upsert({
      where: {
        participantId_date: { participantId, date },
      },
      create: {
        roomId: room.id,
        participantId,
        status,
        description: descriptionTruncated,
        date,
      },
      update: {
        status,
        description: descriptionTruncated,
      },
      select: {
        id: true,
        participantId: true,
        status: true,
        description: true,
        date: true,
      },
    })

    return NextResponse.json(successResponse(impediment), { status: 201 })
  } catch (err) {
    console.error("Erro ao salvar impedimento:", err)
    const res = handleApiError(err)
    const statusCode =
      err instanceof Error && "statusCode" in err ? (err as { statusCode: number }).statusCode : 500
    return NextResponse.json(res, { status: statusCode })
  }
}
