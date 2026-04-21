/**
 * Lógica de aniversário (DD/MM) — timezone da sala alinhado ao restante do app.
 */
import { sortParticipantsForDisplay } from "@/lib/participant-name"

export const ROOM_TIMEZONE = "America/Sao_Paulo"

/** Retorna "DD/MM" para hoje no fuso da sala. */
export function getTodayDDMM(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ROOM_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
  }).formatToParts(new Date())
  const day = parts.find((p) => p.type === "day")?.value ?? "01"
  const month = parts.find((p) => p.type === "month")?.value ?? "01"
  return `${day}/${month}`
}

/** Valida e interpreta string "DD/MM". */
export function parseBirthdayDisplay(value: string | null | undefined): {
  day: number
  month: number
} | null {
  if (value == null || value === "") return null
  const m = /^(\d{2})\/(\d{2})$/.exec(value.trim())
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return { day, month }
}

export function isBirthdayToday(birthdayDisplay: string | null | undefined): boolean {
  const parsed = parseBirthdayDisplay(birthdayDisplay ?? null)
  if (!parsed) return false
  const today = parseBirthdayDisplay(getTodayDDMM())
  if (!today) return false
  return parsed.day === today.day && parsed.month === today.month
}

export type ParticipantBirthdayInput = {
  id: string
  name: string
  isPresent: boolean
  birthdayDisplay: string | null
}

/**
 * Lista ordenada de IDs de aniversariantes presentes (sem repetir, ordem alfabética estável).
 */
export function buildBirthdayCelebrantQueue(
  participants: ParticipantBirthdayInput[]
): string[] {
  const present = participants.filter(
    (p) => p.isPresent && isBirthdayToday(p.birthdayDisplay)
  )
  return sortParticipantsForDisplay(present).map((p) => p.id)
}
