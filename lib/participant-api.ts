import { z } from "zod"
import { parseBirthdayDisplay } from "@/lib/birthday"

export const birthdayDisplaySchema = z
  .string()
  .regex(/^\d{2}\/\d{2}$/, "Use o formato DD/MM")
  .refine((s) => parseBirthdayDisplay(s) !== null, "Data inválida")

export const createParticipantBodySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  birthdayDisplay: z.union([birthdayDisplaySchema, z.literal(""), z.null()]).optional(),
})

export const patchParticipantBodySchema = z
  .object({
    name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo").optional(),
    birthdayDisplay: z
      .union([birthdayDisplaySchema, z.literal(""), z.null()])
      .optional(),
    isPresent: z.boolean().optional(),
  })
  .strict()

export type CreateParticipantBody = z.infer<typeof createParticipantBodySchema>
export type PatchParticipantBody = z.infer<typeof patchParticipantBodySchema>
