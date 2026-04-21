import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { successResponse, errorResponse, handleApiError, getHttpStatusForErrorResponse } from "@/lib/apiResponse"
import { requireRoomSession } from "@/lib/auth"
import type { PokerScale } from "@/lib/poker-utils"

const patchRoomSchema = z.object({
  pokerScale: z.enum(["FIBONACCI", "TSHIRT"]),
})

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
        pokerScale: true,
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

    return NextResponse.json(
      successResponse({
        ...room,
        pokerScale: room.pokerScale as PokerScale,
      })
    )
  } catch (error) {
    console.error("Erro ao buscar sala:", error)
    const err = handleApiError(error)
    return NextResponse.json(err, { status: getHttpStatusForErrorResponse(err) })
  }
}

export async function PATCH(
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
    const parsed = patchRoomSchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join(", ")
      return NextResponse.json(errorResponse("VALIDATION_ERROR", msg), { status: 400 })
    }

    const current = await db.room.findUnique({
      where: { id: room.id },
      select: { pokerScale: true },
    })

    const updated = await db.$transaction(async (tx) => {
      if (current && current.pokerScale !== parsed.data.pokerScale) {
        const votingRound = await tx.pokerRound.findFirst({
          where: { roomId: room.id, status: "VOTING" },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        })
        if (votingRound) {
          await tx.pokerVote.deleteMany({ where: { roundId: votingRound.id } })
        }
      }
      return tx.room.update({
        where: { id: room.id },
        data: { pokerScale: parsed.data.pokerScale },
        select: {
          id: true,
          name: true,
          slug: true,
          pokerScale: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { participants: true, spinHistory: true },
          },
        },
      })
    })

    return NextResponse.json(
      successResponse({
        ...updated,
        pokerScale: updated.pokerScale as PokerScale,
      })
    )
  } catch (error) {
    console.error("Erro ao atualizar sala:", error)
    const err = handleApiError(error)
    return NextResponse.json(err, { status: getHttpStatusForErrorResponse(err) })
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
    const err = handleApiError(error)
    return NextResponse.json(err, { status: getHttpStatusForErrorResponse(err) })
  }
}
