import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export interface Participant {
  id: string
  name: string
  pokerEnabled: boolean
  isPresent?: boolean
}

export interface VoteSummary {
  participantId: string
  hasVoted: boolean
  value?: string | null
}

export interface PokerState {
  round: {
    id: string
    status: "VOTING" | "REVEALED"
    createdAt: string
  }
  participants: Participant[]
  voteSummary: VoteSummary[]
  eligibleCount: number
}

/**
 * Hook para gerenciar o estado do Planning Poker
 */
export function usePokerState(slug: string) {
  const router = useRouter()
  const { toast } = useToast()

  const [state, setState] = useState<PokerState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const loadPokerState = useCallback(async () => {
    try {
      const response = await fetch(`/api/rooms/${slug}/poker`)
      const data = await response.json()

      if (!response.ok || !data.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push(`/room/${slug}`)
          return
        }
        throw new Error(data.error ?? data.message ?? "Erro ao carregar estado do poker")
      }

      setState(data.data)
    } catch (error) {
      console.error("Erro ao carregar estado:", error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao carregar estado",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [slug, router, toast])

  useEffect(() => {
    loadPokerState()
  }, [loadPokerState])

  // Polling durante VOTING
  useEffect(() => {
    if (state?.round.status === "VOTING") {
      pollingIntervalRef.current = setInterval(() => {
        loadPokerState()
      }, 7000) // 7 segundos
    } else {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [state?.round.status, loadPokerState])

  return {
    state,
    isLoading,
    loadPokerState,
    setState,
  }
}
