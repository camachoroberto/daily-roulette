/**
 * Utilitários para Planning Poker (escalas Fibonacci e tamanho).
 */

export const FIBONACCI_VALUES = ["0", "1", "2", "3", "5", "8", "13", "21", "34"] as const
export const TSHIRT_VALUES = ["PP", "P", "M", "G", "GG"] as const
export const COFFEE_VOTE = "☕" as const

export type PokerScale = "FIBONACCI" | "TSHIRT"

export const ALL_VOTE_VALUES_FIBONACCI = [...FIBONACCI_VALUES, COFFEE_VOTE] as const
export const ALL_VOTE_VALUES_TSHIRT = [...TSHIRT_VALUES, COFFEE_VOTE] as const

export type FibonacciVoteValue = (typeof ALL_VOTE_VALUES_FIBONACCI)[number]
export type TshirtVoteValue = (typeof ALL_VOTE_VALUES_TSHIRT)[number]

/** Valores exibidos na UI conforme escala da sala. */
export function getVoteValuesForScale(scale: PokerScale): readonly string[] {
  return scale === "TSHIRT" ? ALL_VOTE_VALUES_TSHIRT : ALL_VOTE_VALUES_FIBONACCI
}

export function isValidVoteForScale(value: string, scale: PokerScale): boolean {
  return getVoteValuesForScale(scale).includes(value)
}

export const ALL_VOTE_VALUES = ALL_VOTE_VALUES_FIBONACCI

export type VoteValue = string

export interface VoteStats {
  average: number | null
  median: number | null
  recommendation: number | string | null
  hasCoffee: boolean
  numericCount: number
}

export interface Vote {
  participantId: string
  value: string
}

const TSHIRT_ORDER: Record<string, number> = {
  PP: 1,
  P: 2,
  M: 3,
  G: 4,
  GG: 5,
}

const TSHIRT_FROM_SCORE: Record<number, string> = {
  1: "PP",
  2: "P",
  3: "M",
  4: "G",
  5: "GG",
}

/**
 * Calcula estatísticas dos votos conforme escala.
 */
export function calculateStats(votes: Vote[], scale: PokerScale = "FIBONACCI"): VoteStats {
  const hasCoffee = votes.some((v) => v.value === COFFEE_VOTE)

  if (scale === "TSHIRT") {
    const scores = votes
      .map((v) => TSHIRT_ORDER[v.value])
      .filter((n): n is number => typeof n === "number")
      .sort((a, b) => a - b)

    if (scores.length === 0) {
      return {
        average: null,
        median: null,
        recommendation: null,
        hasCoffee,
        numericCount: 0,
      }
    }

    const average = scores.reduce((s, n) => s + n, 0) / scores.length
    const median =
      scores.length % 2 === 0
        ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
        : scores[Math.floor(scores.length / 2)]

    const rounded = Math.round(average)
    const clamped = Math.min(5, Math.max(1, rounded))
    const recommendation = TSHIRT_FROM_SCORE[clamped] ?? "M"

    return {
      average: Math.round(average * 100) / 100,
      median: Math.round(median * 100) / 100,
      recommendation,
      hasCoffee,
      numericCount: scores.length,
    }
  }

  const numericVotes = votes
    .filter((v) => FIBONACCI_VALUES.includes(v.value as (typeof FIBONACCI_VALUES)[number]))
    .map((v) => parseInt(v.value, 10))
    .sort((a, b) => a - b)

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
