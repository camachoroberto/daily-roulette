import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { successResponse, errorResponse, handleApiError, getHttpStatusForErrorResponse } from "@/lib/apiResponse"
import { requireRoomSession } from "@/lib/auth"
import { patchParticipantBodySchema } from "@/lib/participant-api"
import { isDuplicateParticipantName } from "@/lib/participant-name"
import { createDuplicateParticipantNameError } from "@/lib/errors"

async function readJsonBody(request: NextRequest): Promise<unknown | null> {
  const text = await request.text()
  if (!text?.trim()) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const { slug, id } = params

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

    const participant = await db.participant.findUnique({
      where: { id },
      select: { id: true, roomId: true, isPresent: true, name: true },
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

    const rawBody = await readJsonBody(request)

    // Corpo vazio: manter compat — alternar presença
    if (rawBody === null) {
      const updated = await db.participant.update({
        where: { id },
        data: { isPresent: !participant.isPresent },
        select: {
          id: true,
          name: true,
          birthdayDisplay: true,
          isPresent: true,
          winCount: true,
          createdAt: true,
          updatedAt: true,
        },
      })
      return NextResponse.json(successResponse(updated))
    }

    const validation = patchParticipantBodySchema.safeParse(rawBody)
    if (!validation.success) {
      const msg = validation.error.errors.map((e) => e.message).join(", ")
      return NextResponse.json(errorResponse("VALIDATION_ERROR", msg), { status: 400 })
    }

    const data = validation.data
    if (Object.keys(data).length === 0) {
      const updated = await db.participant.update({
        where: { id },
        data: { isPresent: !participant.isPresent },
        select: {
          id: true,
          name: true,
          birthdayDisplay: true,
          isPresent: true,
          winCount: true,
          createdAt: true,
          updatedAt: true,
        },
      })
      return NextResponse.json(successResponse(updated))
    }

    if (data.name !== undefined) {
      const others = await db.participant.findMany({
        where: { roomId: room.id },
        select: { id: true, name: true },
      })
      if (isDuplicateParticipantName(data.name, others, id)) {
        throw createDuplicateParticipantNameError()
      }
    }

    const updateData: {
      name?: string
      birthdayDisplay?: string | null
      isPresent?: boolean
    } = {}

    if (data.name !== undefined) updateData.name = data.name.trim()
    if (data.birthdayDisplay !== undefined) {
      updateData.birthdayDisplay =
        data.birthdayDisplay === "" || data.birthdayDisplay === null
          ? null
          : data.birthdayDisplay
    }
    if (data.isPresent !== undefined) updateData.isPresent = data.isPresent

    const updated = await db.participant.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        birthdayDisplay: true,
        isPresent: true,
        winCount: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(successResponse(updated))
  } catch (error) {
    const err = handleApiError(error)
    return NextResponse.json(err, { status: getHttpStatusForErrorResponse(err) })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const { slug, id } = params

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

    await db.participant.delete({
      where: { id },
    })

    return NextResponse.json(successResponse({ ok: true }))
  } catch (error) {
    const err = handleApiError(error)
    return NextResponse.json(err, { status: getHttpStatusForErrorResponse(err) })
  }
}
