"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { useSpinSound } from "@/hooks/use-sound"
import { cn } from "@/lib/utils"
import { Roulette } from "@/components/roulette"
import { WinnerCard } from "@/components/winner-card"
import { RankingChart } from "@/components/ranking-chart"
import { Loader2, Trash2, RotateCcw, LogOut, X, Play, Trophy } from "lucide-react"

interface Participant {
  id: string
  name: string
  isPresent: boolean
  winCount: number
  createdAt: string
  updatedAt: string
}

interface HistoryItem {
  id: string
  participantId: string
  createdAt: string
  participant: {
    id: string
    name: string
  }
}

interface Room {
  id: string
  name: string
  slug: string
  createdAt: string
  updatedAt: string
  _count: {
    participants: number
    spinHistory: number
  }
}

type ImpedimentStatus = "GREEN" | "YELLOW" | "RED"

interface ImpedimentToday {
  id: string
  status: string
  description: string | null
}

interface PreviousDayActiveItem {
  id: string
  participantId: string
  status: string
  description: string | null
  createdAt: string
}

export default function RoomPage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [room, setRoom] = useState<Room | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [passcode, setPasscode] = useState("")
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [newParticipantName, setNewParticipantName] = useState("")
  const [isAddingParticipant, setIsAddingParticipant] = useState(false)
  const [showDeleteRoomDialog, setShowDeleteRoomDialog] = useState(false)
  const [deleteRoomSlug, setDeleteRoomSlug] = useState("")
  const [isDeletingRoom, setIsDeletingRoom] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [isDelayPhase, setIsDelayPhase] = useState(false)
  const [winnerId, setWinnerId] = useState<string | null>(null)
  const [winnerName, setWinnerName] = useState<string | null>(null)
  const [pendingSpin, setPendingSpin] = useState<{
    winner: { id: string; name: string; winCount: number }
    spinHistory: HistoryItem | null
  } | null>(null)

  const [impedimentsToday, setImpedimentsToday] = useState<Record<string, ImpedimentToday>>({})
  const [previousDayActive, setPreviousDayActive] = useState<PreviousDayActiveItem[]>([])
  const [impedimentForm, setImpedimentForm] = useState<
    Record<string, { status: ImpedimentStatus; description: string }>
  >({})
  const [savingImpedimentId, setSavingImpedimentId] = useState<string | null>(null)
  const [resolvingImpedimentId, setResolvingImpedimentId] = useState<string | null>(null)
  const [showRankingDialog, setShowRankingDialog] = useState(false)

  const { play: playSpinSound, stop: stopSpinSound } = useSpinSound()
  const delayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const spinResultRef = useRef<{
    winner: { id: string; name: string; winCount: number }
    spinHistory: HistoryItem | null
  } | null>(null)
  const tripleClickRef = useRef<{ clicks: number; timeout: ReturnType<typeof setTimeout> | null }>({
    clicks: 0,
    timeout: null,
  })

  const loadParticipants = useCallback(async () => {
    try {
      const response = await fetch(`/api/rooms/${params.slug}/participants`)
      const data = await response.json()

      if (response.ok && data.ok) {
        setParticipants(data.data)
      } else if (response.status === 401 || response.status === 403) {
        setShowAuthDialog(true)
      }
    } catch (error) {
      console.error("Erro ao carregar participantes:", error)
    }
  }, [params.slug])

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/rooms/${params.slug}/history?limit=50`)
      const data = await response.json()

      if (response.ok && data.ok) {
        setHistory(data.data)
      }
    } catch (error) {
      console.error("Erro ao carregar histórico:", error)
    }
  }, [params.slug])

  const getTodayDateParam = () =>
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })

  const loadImpediments = useCallback(async () => {
    try {
      const date = getTodayDateParam()
      const response = await fetch(`/api/rooms/${params.slug}/impediments?date=${date}`)
      const data = await response.json()

      if (response.ok && data.ok) {
        setImpedimentsToday(data.data.todayByParticipant ?? {})
        setPreviousDayActive(data.data.previousDayActive ?? [])
      }
    } catch (error) {
      console.error("Erro ao carregar impedimentos:", error)
    }
  }, [params.slug])

  const loadRoomData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Buscar dados da sala
      const roomResponse = await fetch(`/api/rooms/${params.slug}`)
      const roomData = await roomResponse.json()

      if (!roomResponse.ok || !roomData.ok) {
        if (roomResponse.status === 404) {
          toast({
            title: "Erro",
            description: "Sala não encontrada",
            variant: "destructive",
          })
          router.push("/")
          return
        }
        throw new Error(roomData.message || "Erro ao carregar sala")
      }

      setRoom(roomData.data)

      // Verificar se há sessão válida
      const sessionResponse = await fetch(`/api/rooms/${params.slug}/check-session`)
      if (!sessionResponse.ok) {
        setShowAuthDialog(true)
      }

      await loadParticipants()
      await loadHistory()
      await loadImpediments()
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setIsLoading(false)
    }
  }, [params.slug, router, toast, loadParticipants, loadHistory, loadImpediments])

  useEffect(() => {
    setImpedimentForm((prev) => ({
      ...prev,
      ...Object.fromEntries(
        participants.map((p) => [
          p.id,
          {
            status: (impedimentsToday[p.id]?.status as ImpedimentStatus) ?? "GREEN",
            description: impedimentsToday[p.id]?.description ?? "",
          },
        ])
      ),
    }))
  }, [participants, impedimentsToday])

  useEffect(() => {
    loadRoomData()
  }, [loadRoomData])

  // Cleanup: timers e áudio ao desmontar
  useEffect(() => {
    return () => {
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current)
        delayTimeoutRef.current = null
      }
      if (tripleClickRef.current.timeout) {
        clearTimeout(tripleClickRef.current.timeout)
        tripleClickRef.current.timeout = null
      }
      stopSpinSound()
    }
  }, [stopSpinSound])

  const handleAuth = async () => {
    if (!passcode.trim()) {
      toast({
        title: "Erro",
        description: "Digite a senha",
        variant: "destructive",
      })
      return
    }

    setIsAuthenticating(true)
    try {
      const response = await fetch(`/api/rooms/${params.slug}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Senha incorreta")
      }

      toast({
        title: "Sucesso!",
        description: "Autenticado com sucesso",
      })

      setShowAuthDialog(false)
      setPasscode("")
      await loadParticipants()
      await loadHistory()
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao autenticar",
        variant: "destructive",
      })
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleAddParticipant = async () => {
    if (!newParticipantName.trim()) {
      toast({
        title: "Erro",
        description: "Digite o nome do participante",
        variant: "destructive",
      })
      return
    }

    setIsAddingParticipant(true)
    try {
      const response = await fetch(`/api/rooms/${params.slug}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newParticipantName.trim() }),
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        if (response.status === 401 || response.status === 403) {
          setShowAuthDialog(true)
          return
        }
        throw new Error(data.message || "Erro ao adicionar participante")
      }

      toast({
        title: "Sucesso!",
        description: "Participante adicionado",
      })

      setNewParticipantName("")
      await loadParticipants()
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao adicionar participante",
        variant: "destructive",
      })
    } finally {
      setIsAddingParticipant(false)
    }
  }

  const handleTogglePresence = async (participantId: string) => {
    try {
      const response = await fetch(`/api/rooms/${params.slug}/participants/${participantId}`, {
        method: "PATCH",
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        if (response.status === 401 || response.status === 403) {
          setShowAuthDialog(true)
          return
        }
        throw new Error(data.message || "Erro ao atualizar participante")
      }

      await loadParticipants()
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao atualizar participante",
        variant: "destructive",
      })
    }
  }

  const handleDeleteParticipant = async (participantId: string) => {
    try {
      const response = await fetch(`/api/rooms/${params.slug}/participants/${participantId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        if (response.status === 401 || response.status === 403) {
          setShowAuthDialog(true)
          return
        }
        throw new Error(data.message || "Erro ao remover participante")
      }

      toast({
        title: "Sucesso!",
        description: "Participante removido",
      })

      await loadParticipants()
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao remover participante",
        variant: "destructive",
      })
    }
  }

  const handleReset = async () => {
    setIsResetting(true)
    try {
      const response = await fetch(`/api/rooms/${params.slug}/reset`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        if (response.status === 401 || response.status === 403) {
          setShowAuthDialog(true)
          return
        }
        throw new Error(data.message || "Erro ao resetar sala")
      }

      toast({
        title: "Sucesso!",
        description: "Sala resetada com sucesso",
      })

      await loadParticipants()
      await loadHistory()
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao resetar sala",
        variant: "destructive",
      })
    } finally {
      setIsResetting(false)
    }
  }

  const handleDeleteRoom = async () => {
    if (deleteRoomSlug !== params.slug) {
      toast({
        title: "Erro",
        description: "O slug não confere",
        variant: "destructive",
      })
      return
    }

    setIsDeletingRoom(true)
    try {
      const response = await fetch(`/api/rooms/${params.slug}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        if (response.status === 401 || response.status === 403) {
          setShowAuthDialog(true)
          return
        }
        throw new Error(data.message || "Erro ao excluir sala")
      }

      toast({
        title: "Sucesso!",
        description: "Sala excluída com sucesso",
      })

      router.push("/")
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao excluir sala",
        variant: "destructive",
      })
    } finally {
      setIsDeletingRoom(false)
      setShowDeleteRoomDialog(false)
      setDeleteRoomSlug("")
    }
  }

  const handleLogout = async () => {
    try {
      await fetch(`/api/rooms/${params.slug}/logout`, {
        method: "POST",
      })
      router.push("/")
    } catch (error) {
      console.error("Erro ao fazer logout:", error)
    }
  }

  const isSpinFlowActive = isDelayPhase || isSpinning

  const delayHasFiredRef = useRef(false)

  const handleSpin = async () => {
    if (presentCount === 0) {
      toast({
        title: "Atenção",
        description: "Adicione participantes presentes para sortear",
        variant: "destructive",
      })
      return
    }
    if (isSpinFlowActive) return

    setWinnerId(null)
    setIsDelayPhase(true)
    playSpinSound()
    delayHasFiredRef.current = false

    const startSpinAnimation = () => {
      const res = spinResultRef.current
      if (res) {
        setWinnerId(res.winner.id)
        setWinnerName(res.winner.name)
        setIsSpinning(true)
      }
      setIsDelayPhase(false)
    }

    delayTimeoutRef.current = setTimeout(() => {
      delayTimeoutRef.current = null
      delayHasFiredRef.current = true
      startSpinAnimation()
    }, 10_000)

    try {
      const response = await fetch(`/api/rooms/${params.slug}/spin`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        if (delayTimeoutRef.current) {
          clearTimeout(delayTimeoutRef.current)
          delayTimeoutRef.current = null
        }
        if (response.status === 401 || response.status === 403) {
          setShowAuthDialog(true)
          setIsDelayPhase(false)
          stopSpinSound()
          return
        }

        if (data.code === "NO_PRESENT_PARTICIPANTS") {
          toast({
            title: "Atenção",
            description: "Não há participantes presentes para sortear",
            variant: "destructive",
          })
          setIsDelayPhase(false)
          stopSpinSound()
          return
        }

        throw new Error(data.message || "Erro ao sortear")
      }

      const result = {
        winner: data.data.winner,
        spinHistory: data.data.spinHistory || null,
      }
      setPendingSpin(result)
      spinResultRef.current = result

      if (delayHasFiredRef.current) {
        startSpinAnimation()
      }
    } catch (error) {
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current)
        delayTimeoutRef.current = null
      }
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao sortear",
        variant: "destructive",
      })
      setIsDelayPhase(false)
      stopSpinSound()
      setWinnerId(null)
      setWinnerName(null)
      setPendingSpin(null)
      spinResultRef.current = null
    }
  }

  const [lastWinner, setLastWinner] = useState<{
    name: string
    createdAt: string
  } | null>(null)

  const handleSpinComplete = async () => {
    stopSpinSound()
    if (pendingSpin) {
      // Atualizar histórico com o item do spin
      if (pendingSpin.spinHistory) {
        setHistory((prev) => [pendingSpin.spinHistory!, ...prev].slice(0, 50))
        // Mostrar card do vencedor
        setLastWinner({
          name: pendingSpin.winner.name,
          createdAt: pendingSpin.spinHistory.createdAt,
        })
      }

      // Atualizar participantes (para atualizar winCount)
      await loadParticipants()

      // Limpar pendingSpin
      setPendingSpin(null)
      setWinnerName(null)
    } else {
      // Fallback: recarregar tudo se não houver pendingSpin
      await loadParticipants()
      await loadHistory()
    }

    setIsSpinning(false)
  }

  const handleSaveImpediment = async (participantId: string) => {
    const form = impedimentForm[participantId]
    if (!form) return
    setSavingImpedimentId(participantId)
    try {
      const response = await fetch(`/api/rooms/${params.slug}/impediments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          status: form.status,
          description: form.status === "GREEN" ? undefined : (form.description || undefined),
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        if (response.status === 401 || response.status === 403) {
          setShowAuthDialog(true)
          return
        }
        throw new Error(data.message || "Erro ao salvar impedimento")
      }
      toast({ title: "Salvo!", description: "Status do dia atualizado." })
      await loadImpediments()
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar",
        variant: "destructive",
      })
    } finally {
      setSavingImpedimentId(null)
    }
  }

  const handleResolveImpediment = async (participantId: string) => {
    setResolvingImpedimentId(participantId)
    try {
      const response = await fetch(`/api/rooms/${params.slug}/impediments/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        if (response.status === 401 || response.status === 403) {
          setShowAuthDialog(true)
          return
        }
        throw new Error(data.message || "Erro ao resolver")
      }
      toast({ title: "Resolvido!", description: "Impedimento marcado como resolvido." })
      await loadImpediments()
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao resolver",
        variant: "destructive",
      })
    } finally {
      setResolvingImpedimentId(null)
    }
  }

  const handleTripleClick = () => {
    // Limpar timeout anterior se existir
    if (tripleClickRef.current.timeout) {
      clearTimeout(tripleClickRef.current.timeout)
    }

    // Incrementar contador
    tripleClickRef.current.clicks += 1

    // Se chegou a 3 cliques, navegar para poker
    if (tripleClickRef.current.clicks >= 3) {
      router.push(`/room/${params.slug}/poker`)
      tripleClickRef.current.clicks = 0
      if (tripleClickRef.current.timeout) {
        clearTimeout(tripleClickRef.current.timeout)
        tripleClickRef.current.timeout = null
      }
      return
    }

    // Criar timeout para resetar contador após 1200ms
    tripleClickRef.current.timeout = setTimeout(() => {
      tripleClickRef.current.clicks = 0
      tripleClickRef.current.timeout = null
    }, 1200)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!room) {
    return null
  }

  const presentCount = participants.filter((p) => p.isPresent).length

  return (
    <div className="min-h-screen bg-background">
      {/* Header fixo */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <h1
            className="text-xl font-semibold text-foreground truncate flex-1 min-w-0 cursor-pointer select-none"
            onClick={handleTripleClick}
            title="Triple-click para acessar Planning Poker"
          >
            {room.name}
          </h1>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-4 shrink-0">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">

        {/* Layout: Desktop 2 colunas, Mobile stack */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Coluna Esquerda - Participantes (Desktop) / Segunda (Mobile) */}
          <div className="order-2 lg:order-1">
            <Card>
              <CardHeader>
                <CardTitle>Participantes</CardTitle>
                <CardDescription>
                  {presentCount} presente{presentCount !== 1 ? "s" : ""} de {participants.length}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Adicionar participante */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label htmlFor="new-participant-name" className="sr-only">
                      Nome do participante
                    </label>
                    <Input
                      id="new-participant-name"
                      placeholder="Nome do participante"
                      value={newParticipantName}
                      onChange={(e) => setNewParticipantName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddParticipant()
                        }
                      }}
                      disabled={isAddingParticipant}
                      aria-describedby="new-participant-description"
                    />
                    <p id="new-participant-description" className="sr-only">
                      Digite o nome e pressione Enter ou clique em Adicionar
                    </p>
                  </div>
                  <Button
                    onClick={handleAddParticipant}
                    disabled={isAddingParticipant}
                    aria-label={isAddingParticipant ? "Adicionando participante..." : "Adicionar participante"}
                  >
                    {isAddingParticipant ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        <span className="sr-only">Adicionando...</span>
                      </>
                    ) : (
                      "Adicionar"
                    )}
                  </Button>
                </div>

                {/* Lista de participantes + impedimentos */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {participants.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhum participante ainda
                    </p>
                  ) : (
                    participants.map((participant) => {
                      const form = impedimentForm[participant.id] ?? {
                        status: "GREEN" as ImpedimentStatus,
                        description: "",
                      }
                      const prevActive = previousDayActive.find((a) => a.participantId === participant.id)
                      const isSaving = savingImpedimentId === participant.id
                      const isResolving = resolvingImpedimentId === participant.id
                      return (
                        <div
                          key={participant.id}
                          className="p-3 border rounded-lg hover:bg-muted/50 transition-colors group space-y-2.5"
                        >
                          {/* Primeira linha: Toggle + Nome + Badge + Botão X */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Switch
                                checked={participant.isPresent}
                                onCheckedChange={() => handleTogglePresence(participant.id)}
                              />
                              <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                                <div className="font-medium text-foreground truncate">{participant.name}</div>
                                <span
                                  className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground shrink-0"
                                  aria-label={`Sorteado ${participant.winCount} vez${participant.winCount !== 1 ? "es" : ""}`}
                                >
                                  {participant.winCount}x
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteParticipant(participant.id)}
                              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive h-8 w-8 shrink-0"
                              aria-label={`Remover participante ${participant.name}`}
                            >
                              <X className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </div>

                          {/* Terceira linha: Status (bolinhas) */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Status:</span>
                            <div className="flex items-center gap-1.5">
                              {(["GREEN", "YELLOW", "RED"] as const).map((status) => {
                                const statusLabels = {
                                  GREEN: "Sem impedimento",
                                  YELLOW: "Atenção",
                                  RED: "Bloqueado",
                                }
                                const statusIcons = {
                                  GREEN: "🟢",
                                  YELLOW: "🟡",
                                  RED: "🔴",
                                }
                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() =>
                                      setImpedimentForm((prev) => ({
                                        ...prev,
                                        [participant.id]: { ...form, status },
                                      }))
                                    }
                                    className={cn(
                                      "rounded-full p-1.5 text-lg border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 shrink-0",
                                      form.status === status
                                        ? status === "GREEN"
                                          ? "border-green-600 bg-green-100 dark:bg-green-900/30"
                                          : status === "YELLOW"
                                            ? "border-yellow-600 bg-yellow-100 dark:bg-yellow-900/30"
                                            : "border-red-600 bg-red-100 dark:bg-red-900/30"
                                        : "border-transparent opacity-60 hover:opacity-100"
                                    )}
                                    title={statusLabels[status]}
                                    aria-label={`${statusLabels[status]} - ${participant.name}`}
                                    aria-pressed={form.status === status}
                                  >
                                    <span aria-hidden="true">{statusIcons[status]}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                          {(form.status === "YELLOW" || form.status === "RED") && (
                            <div>
                              <label htmlFor={`impediment-desc-${participant.id}`} className="sr-only">
                                Descrição do impedimento para {participant.name}
                              </label>
                              <Input
                                id={`impediment-desc-${participant.id}`}
                                placeholder="Descrição curta (máx. 100)"
                                value={form.description}
                                onChange={(e) =>
                                  setImpedimentForm((prev) => ({
                                    ...prev,
                                    [participant.id]: {
                                      ...form,
                                      description: e.target.value.slice(0, 100),
                                    },
                                  }))
                                }
                                maxLength={100}
                                className="text-sm h-8"
                                aria-describedby={`impediment-desc-help-${participant.id}`}
                              />
                              <p id={`impediment-desc-help-${participant.id}`} className="sr-only">
                                Máximo de 100 caracteres
                              </p>
                            </div>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleSaveImpediment(participant.id)}
                            disabled={isSaving}
                            className="h-8"
                            aria-label={isSaving ? `Salvando impedimento de ${participant.name}...` : `Salvar status de impedimento de ${participant.name}`}
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                <span className="sr-only">Salvando...</span>
                              </>
                            ) : (
                              "Salvar"
                            )}
                          </Button>

                          {prevActive && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-2.5 text-sm">
                              <p className="text-amber-800 dark:text-amber-200 font-medium mb-2">
                                Você tinha um impedimento ontem. Ainda está válido?
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleResolveImpediment(participant.id)}
                                  disabled={isResolving}
                                  aria-label={isResolving ? `Resolvendo impedimento de ${participant.name}...` : `Marcar impedimento de ${participant.name} como resolvido`}
                                >
                                  {isResolving ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                                      <span className="sr-only">Resolvendo...</span>
                                    </>
                                  ) : (
                                    "Resolvido"
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    toast({
                                      title: "Ok",
                                      description: "Impedimento mantido para acompanhamento.",
                                    })
                                  }
                                  aria-label={`Manter impedimento de ${participant.name} ativo`}
                                >
                                  Ainda tenho
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna Direita - Roleta e Histórico (Desktop) / Primeira (Mobile) */}
          <div className="space-y-6 order-1 lg:order-2">
            {/* Roleta */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle>Roleta</CardTitle>
                    <CardDescription>
                      {presentCount > 0
                        ? `${presentCount} participante${presentCount !== 1 ? "s" : ""} presente${presentCount !== 1 ? "s" : ""}`
                        : "Adicione participantes presentes para sortear"}
                    </CardDescription>
                  </div>
                  <Dialog open={showRankingDialog} onOpenChange={setShowRankingDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="shrink-0">
                        <Trophy className="mr-2 h-4 w-4" />
                        Ver ranking
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                      <DialogHeader>
                        <DialogTitle>Ranking de Sorteios</DialogTitle>
                        <DialogDescription>
                          Quantidade de vezes que cada pessoa foi sorteada
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex-1 overflow-y-auto py-4">
                        <RankingChart participants={participants} />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Roulette
                  participants={participants}
                  winnerId={winnerId}
                  onSpinComplete={handleSpinComplete}
                  isSpinning={isSpinning}
                />
                <Button
                  onClick={handleSpin}
                  disabled={isSpinFlowActive || presentCount === 0}
                  className="w-full"
                  size="lg"
                  aria-label={
                    presentCount === 0
                      ? "Não é possível girar a roleta: adicione participantes presentes"
                      : isDelayPhase
                        ? "Preparando roleta..."
                        : isSpinning
                          ? "Roleta girando..."
                          : "Girar roleta para sortear um participante"
                  }
                  aria-describedby={presentCount === 0 ? "spin-disabled-reason" : undefined}
                >
                  {isDelayPhase ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                      Preparando...
                    </>
                  ) : isSpinning ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                      Girando...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5" aria-hidden="true" />
                      Girar Roleta
                    </>
                  )}
                </Button>
                {presentCount === 0 && (
                  <p id="spin-disabled-reason" className="sr-only">
                    Adicione pelo menos um participante presente para poder girar a roleta
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Card Sorteado (após animação) */}
            {lastWinner && (
              <WinnerCard
                winnerName={lastWinner.name}
                createdAt={lastWinner.createdAt}
              />
            )}

            {/* Histórico */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Sorteios</CardTitle>
                <CardDescription>Registro de auditoria</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto scrollbar-thin">
                  {history.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhum sorteio registrado
                    </p>
                  ) : (
                    history.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-foreground">{item.participant.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {new Date(item.createdAt).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Ações da Sala */}
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Ações da Sala</CardTitle>
                <CardDescription className="text-destructive/80">
                  Essas ações não podem ser desfeitas. Confirme antes de continuar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isResetting}
                  className="w-full"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetando...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Resetar Sala
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteRoomDialog(true)}
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Sala
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialog de Autenticação */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Autenticação Necessária</DialogTitle>
            <DialogDescription>
              Digite a senha da sala para continuar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Senha da sala"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAuth()
                }
              }}
              disabled={isAuthenticating}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleAuth}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Autenticando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Exclusão */}
      <AlertDialog open={showDeleteRoomDialog} onOpenChange={setShowDeleteRoomDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Digite o slug da sala para confirmar:{" "}
              <span className="font-mono font-semibold">{params.slug}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Digite o slug para confirmar"
              value={deleteRoomSlug}
              onChange={(e) => setDeleteRoomSlug(e.target.value)}
              disabled={isDeletingRoom}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingRoom}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRoom}
              disabled={isDeletingRoom || deleteRoomSlug !== params.slug}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingRoom ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
