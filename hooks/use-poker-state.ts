import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import type { PokerScale } from "@/lib/poker-utils"

/** Intervalo entre sincronizações automáticas (sala pequena, UX colaborativa). */
const POLL_INTERVAL_MS = 2_500

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
  pokerScale: PokerScale
  round: {
    id: string
    status: "WAITING" | "VOTING" | "REVEALED"
    createdAt: string
  }
  participants: Participant[]
  voteSummary: VoteSummary[]
  eligibleCount: number
}

export type LoadPokerStateOptions = {
  /** Se true, não exibe toast em erro (uso no polling em background). */
  silent?: boolean
}

/**
 * Estado do Planning Poker com sincronização contínua:
 * - fetch inicial ao montar;
 * - polling leve em WAITING / VOTING / REVEALED (antes só havia polling em VOTING);
 * - pausa o intervalo com a aba oculta; refresh ao voltar.
 */
export function usePokerState(slug: string) {
  const router = useRouter()
  const { toast } = useToast()

  const [state, setState] = useState<PokerState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const fetchGenerationRef = useRef(0)

  const loadPokerState = useCallback(
    async (opts?: LoadPokerStateOptions) => {
      const silent = opts?.silent ?? false
      const myGen = ++fetchGenerationRef.current

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

        if (myGen !== fetchGenerationRef.current) return

        const payload = data.data as PokerState & { pokerScale?: PokerScale }
        setState({
          ...payload,
          pokerScale: payload.pokerScale ?? "FIBONACCI",
        })
      } catch (error) {
        if (myGen !== fetchGenerationRef.current) return
        console.error("Erro ao carregar estado:", error)
        if (!silent) {
          toast({
            title: "Erro",
            description: error instanceof Error ? error.message : "Erro ao carregar estado",
            variant: "destructive",
          })
        }
      } finally {
        if (!silent && myGen === fetchGenerationRef.current) {
          setIsLoading(false)
        }
      }
    },
    [slug, router, toast]
  )

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null
    let cancelled = false

    const poll = () => {
      void loadPokerState({ silent: true })
    }

    const startInterval = () => {
      if (intervalId != null || cancelled) return
      intervalId = setInterval(poll, POLL_INTERVAL_MS)
    }

    const stopInterval = () => {
      if (intervalId != null) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    const onVisibility = () => {
      if (typeof document === "undefined") return
      if (document.visibilityState === "hidden") {
        stopInterval()
      } else {
        poll()
        startInterval()
      }
    }

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility)
    }

    void (async () => {
      await loadPokerState()
      if (cancelled) return
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        startInterval()
      }
    })()

    return () => {
      cancelled = true
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility)
      }
      stopInterval()
    }
  }, [loadPokerState])

  return {
    state,
    isLoading,
    loadPokerState,
    setState,
  }
}
