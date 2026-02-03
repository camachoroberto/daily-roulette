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

export const impedimentStatusEnum = z.enum(["GREEN", "YELLOW", "RED"])

export const upsertImpedimentSchema = z.object({
  participantId: z.string().min(1, "participantId é obrigatório"),
  status: impedimentStatusEnum,
  description: z
    .string()
    .max(100, "Máximo 100 caracteres")
    .transform((s) => (s.trim() === "" ? undefined : s.trim().slice(0, 100)))
    .optional()
    .nullable(),
})

export const resolveImpedimentSchema = z.object({
  participantId: z.string().min(1, "participantId é obrigatório"),
})

export type UpsertImpedimentInput = z.infer<typeof upsertImpedimentSchema>
export type ResolveImpedimentInput = z.infer<typeof resolveImpedimentSchema>
