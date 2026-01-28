import { z } from "zod"

/**
 * Schema de validação para criar uma sala
 */
export const createRoomSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  slug: z
    .string()
    .min(1, "Slug é obrigatório")
    .max(50, "Slug muito longo")
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  passcode: z.string().min(1, "Senha é obrigatória").max(100, "Senha muito longa"),
})

export type CreateRoomInput = z.infer<typeof createRoomSchema>
