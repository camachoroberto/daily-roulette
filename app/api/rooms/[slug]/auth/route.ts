import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcrypt"
import { db } from "@/lib/db"
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse"
import {
  createRoomSession,
  setRoomSessionCookie,
} from "@/lib/auth"

const authSchema = z.object({
  passcode: z.string().min(1, "Senha é obrigatória"),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    const body = await request.json()

    // Validar com Zod
    const validationResult = authSchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(", ")
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", errors),
        { status: 400 }
      )
    }

    const { passcode } = validationResult.data

    // Buscar a sala
    const room = await db.room.findUnique({
      where: { slug },
      select: {
        id: true,
        passcodeHash: true,
      },
    })

    if (!room) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "Sala não encontrada"),
        { status: 404 }
      )
    }

    // Verificar senha
    const isValid = await bcrypt.compare(passcode, room.passcodeHash)
    if (!isValid) {
      return NextResponse.json(
        errorResponse("UNAUTHORIZED", "Senha incorreta"),
        { status: 401 }
      )
    }

    // Criar sessão
    const sessionToken = await createRoomSession(room.id)

    // Criar resposta
    const response = NextResponse.json(successResponse({ ok: true }))

    // Definir cookie
    setRoomSessionCookie(response, sessionToken)

    return response
  } catch (error) {
    console.error("Erro ao autenticar:", error)
    const errorResponse = handleApiError(error)
    const statusCode = error instanceof Error && "statusCode" in error
      ? (error as any).statusCode
      : 500
    return NextResponse.json(errorResponse, { status: statusCode })
  }
}
