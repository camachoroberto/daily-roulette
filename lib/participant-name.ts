/**
 * Normalização e ordenação de nomes de participantes (sem persistir ordem no banco).
 */

/** Remove acentos, minúsculas, colapsa espaços internos, trim. */
export function normalizeParticipantNameForCompare(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
}

/** Verifica duplicata ignorando case, acentos e espaços extras. */
export function isDuplicateParticipantName(
  name: string,
  others: { id?: string; name: string }[],
  excludeParticipantId?: string
): boolean {
  const target = normalizeParticipantNameForCompare(name)
  if (!target) return false
  return others.some((p) => {
    if (excludeParticipantId && p.id === excludeParticipantId) return false
    return normalizeParticipantNameForCompare(p.name) === target
  })
}

/** Ordenação alfabética estável apenas para exibição (locale pt-BR). */
export function sortParticipantsForDisplay<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    normalizeParticipantNameForCompare(a.name).localeCompare(
      normalizeParticipantNameForCompare(b.name),
      "pt-BR"
    )
  )
}
