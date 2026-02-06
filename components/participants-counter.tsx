"use client"

interface ParticipantsCounterProps {
  participants: Array<{
    id: string
    name: string
    isPresent: boolean
  }>
  className?: string
}

export function ParticipantsCounter({ participants, className }: ParticipantsCounterProps) {
  const total = participants.length

  if (total === 0) {
    return (
      <div className={className}>
        <span className="text-sm text-muted-foreground">Nenhum participante</span>
      </div>
    )
  }

  return (
    <div
      className={`flex items-center gap-x-2 text-xs sm:text-sm ${className || ""}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="text-muted-foreground">Participantes:</span>
      <span className="font-medium text-foreground">{total}</span>
      <span className="sr-only">
        Total de {total} participante{total !== 1 ? "s" : ""}
      </span>
    </div>
  )
}
