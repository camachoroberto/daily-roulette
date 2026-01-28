import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcrypt"
import { db } from "@/lib/db"
import { successResponse, errorResponse, handleApiError } from "@/lib/apiResponse"

const createRoomSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  slug: z
    .string()
    .min(1, "Slug é obrigatório")
    .max(50, "Slug muito longo")
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  passcode: z.string().min(1, "Senha é obrigatória").max(100, "Senha muito longa"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validar com Zod
    const validationResult = createRoomSchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(", ")
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", errors),
        { status: 400 }
      )
    }

    const { name, slug, passcode } = validationResult.data

    // Verificar se o slug já existe
    const existingRoom = await db.room.findUnique({
      where: { slug },
    })

    if (existingRoom) {
      return NextResponse.json(
        errorResponse("CONFLICT", "Já existe uma sala com este slug"),
        { status: 409 }
      )
    }

    // Gerar hash da senha
    const saltRounds = 10
    const passcodeHash = await bcrypt.hash(passcode, saltRounds)

    // Criar a sala
    const room = await db.room.create({
      data: {
        name,
        slug,
        passcodeHash,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(successResponse(room), { status: 201 })
  } catch (error) {
    console.error("Erro ao criar sala:", error)
    const errorResponse = handleApiError(error)
    const statusCode = error instanceof Error && "statusCode" in error 
      ? (error as any).statusCode 
      : 500
    return NextResponse.json(errorResponse, { status: statusCode })
  }
}
