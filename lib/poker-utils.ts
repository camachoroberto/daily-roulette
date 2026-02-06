/**
 * Utilitários para Planning Poker
 */

export const FIBONACCI_VALUES = ["0", "1", "2", "3", "5", "8", "13", "21", "34"] as const
export const ALL_VOTE_VALUES = [...FIBONACCI_VALUES, "☕"] as const

export type VoteValue = typeof ALL_VOTE_VALUES[number]

export interface VoteStats {
  average: number | null
  median: number | null
  recommendation: number | null
  hasCoffee: boolean
  numericCount: number
}

export interface Vote {
  participantId: string
  value: string
}

/**
 * Calcula estatísticas dos votos (média, mediana, recomendação Fibonacci)
 */
export function calculateStats(votes: Vote[]): VoteStats {
  const numericVotes = votes
    .filter((v) => FIBONACCI_VALUES.includes(v.value as any))
    .map((v) => parseInt(v.value, 10))
    .sort((a, b) => a - b)

  const hasCoffee = votes.some((v) => v.value === "☕")

  if (numericVotes.length === 0) {
    return {
      average: null,
      median: null,
      recommendation: null,
      hasCoffee,
      numericCount: 0,
    }
  }

  const average = numericVotes.reduce((sum, val) => sum + val, 0) / numericVotes.length
  const median =
    numericVotes.length % 2 === 0
      ? (numericVotes[numericVotes.length / 2 - 1] + numericVotes[numericVotes.length / 2]) / 2
      : numericVotes[Math.floor(numericVotes.length / 2)]

  // Encontrar o Fibonacci mais próximo da mediana
  const fibValues = [0, 1, 2, 3, 5, 8, 13, 21, 34]
  let recommendation = fibValues[0]
  let minDiff = Math.abs(median - recommendation)

  for (const fib of fibValues) {
    const diff = Math.abs(median - fib)
    if (diff < minDiff) {
      minDiff = diff
      recommendation = fib
    }
  }

  return {
    average: Math.round(average * 100) / 100,
    median: Math.round(median * 100) / 100,
    recommendation,
    hasCoffee,
    numericCount: numericVotes.length,
  }
}

/**
 * Obtém ou cria um sessionId único para o navegador
 */
export function getSessionId(): string {
  if (typeof window === "undefined") return ""
  let sessionId = localStorage.getItem("poker_sessionId")
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem("poker_sessionId", sessionId)
  }
  return sessionId
}
