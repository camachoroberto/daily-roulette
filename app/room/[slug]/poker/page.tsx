"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
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
import { usePokerState } from "@/hooks/use-poker-state"
import { calculateStats, getSessionId, ALL_VOTE_VALUES } from "@/lib/poker-utils"
import { pokerApiCall } from "@/lib/poker-api"
import { Loader2, ArrowLeft, CheckCircle2, Clock, AlertCircle, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

export default function PokerPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const { toast } = useToast()

  const { state, isLoading, loadPokerState, setState } = usePokerState(slug)
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>("")
  const [selectedVote, setSelectedVote] = useState<string>("")
  const [isClaiming, setIsClaiming] = useState(false)
  const [isVoting, setIsVoting] = useState(false)
  const [isRevealing, setIsRevealing] = useState(false)
  const [isNewRound, setIsNewRound] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [nameTaken, setNameTaken] = useState(false)
  const [sessionId] = useState(() => getSessionId())

  const handleClaimParticipant = async (participantId: string) => {
    setIsClaiming(true)
    setNameTaken(false)

    try {
      await pokerApiCall({
        slug,
        endpoint: "/claim",
        body: { participantId, sessionId },
      }).then((res) => res.data)
      setSelectedParticipantId(participantId)
      setNameTaken(false)
    } catch (error) {
      const err = error as Error & { code?: string }
      if (err.code === "NAME_TAKEN") {
        setNameTaken(true)
        toast({
          title: "Nome em uso",
          description: "Este nome já está sendo usado por outra pessoa nesta sala.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Erro",
          description: err.message || "Erro ao fazer claim",
          variant: "destructive",
        })
      }
    } finally {
      setIsClaiming(false)
    }
  }

  const handleVote = async (value: string) => {
    if (!selectedParticipantId || !state) {
      toast({
        title: "Erro",
        description: "Selecione um participante primeiro",
        variant: "destructive",
      })
      return
    }

    setIsVoting(true)

    try {
      await pokerApiCall({
        slug,
        endpoint: "/vote",
        body: {
          roundId: state.round.id,
          participantId: selectedParticipantId,
          sessionId,
          value,
        },
      }).then((res) => res.data)
      setSelectedVote(value)
      toast({
        title: "Voto registrado!",
        description: "Aguarde todos votarem para revelar.",
      })
      await loadPokerState()
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao votar",
        variant: "destructive",
      })
    } finally {
      setIsVoting(false)
    }
  }

  const handleReveal = async () => {
    if (!state) return

    setIsRevealing(true)

    try {
      await pokerApiCall({
        slug,
        endpoint: "/reveal",
        body: { roundId: state.round.id },
      })
      toast({
        title: "Votos revelados!",
        description: "Todos os votos foram exibidos.",
      })
      await loadPokerState()
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao revelar",
        variant: "destructive",
      })
    } finally {
      setIsRevealing(false)
    }
  }

  const handleNewRound = async () => {
    setIsNewRound(true)

    try {
      await pokerApiCall({
        slug,
        endpoint: "/new-round",
      }).then((res) => res.data)
      setSelectedVote("")
      toast({
        title: "Nova rodada iniciada!",
        description: "Todos podem votar novamente.",
      })
      await loadPokerState()
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao criar nova rodada",
        variant: "destructive",
      })
    } finally {
      setIsNewRound(false)
    }
  }

  const handleResetVoting = async () => {
    setIsResetting(true)
    setShowResetDialog(false)

    try {
      const response = await fetch(`/api/rooms/${slug}/poker/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? data.message ?? "Erro ao reiniciar votação")
      }

      setSelectedVote("")
      toast({
        title: "Votação reiniciada!",
        description: "Todos os votos foram descartados. A votação recomeçou.",
      })
      await loadPokerState()
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao reiniciar votação",
        variant: "destructive",
      })
    } finally {
      setIsResetting(false)
    }
  }

  const handleTogglePokerEnabled = async (participantId: string, enabled: boolean) => {
    // Ignorar se já está salvando
    if (savingIds.has(participantId)) {
      return
    }

    // Lock: adicionar ao Set de salvando
    setSavingIds((prev) => new Set(prev).add(participantId))

    // Atualização otimista: atualizar estado local imediatamente
    const previousState = state
    if (previousState) {
      setState({
        ...previousState,
        participants: previousState.participants.map((p) =>
          p.id === participantId ? { ...p, pokerEnabled: enabled } : p
        ),
      })
    }

    try {
      await pokerApiCall({
        slug,
        endpoint: `/participants/${participantId}`,
        method: "PATCH",
        body: { pokerEnabled: enabled },
      }).then((res) => res.data)
      // Recarregar estado do servidor para garantir sincronização
      await loadPokerState()
    } catch (error) {
      // Rollback: restaurar estado anterior em caso de erro
      if (previousState) {
        setState(previousState)
      }
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao atualizar",
        variant: "destructive",
      })
    } finally {
      // Unlock: remover do Set de salvando
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(participantId)
        return next
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!state) {
    return null
  }

  const selectedParticipant = state.participants.find((p) => p.id === selectedParticipantId)
  const myVoteSummary = state.voteSummary.find((v) => v.participantId === selectedParticipantId)
  const allVoted = state.voteSummary.every((v) => v.hasVoted)
  const isRevealed = state.round.status === "REVEALED"

  // Calcular estatísticas se revelado
  const stats = isRevealed
    ? calculateStats(
        state.voteSummary
          .filter((v) => v.value !== null && v.value !== undefined)
          .map((v) => ({
            participantId: v.participantId,
            value: v.value!,
          }))
      )
    : null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-start gap-3 py-5">
            {/* Link de navegação discreto */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/room/${slug}`)}
              className="shrink-0 mt-0.5 h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Voltar para Roleta"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            {/* Título */}
            <div className="flex-1 min-w-0 pt-0.5">
              <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Planning Poker</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 md:px-6 pt-8 pb-6 md:py-8 max-w-4xl">
        {/* Bloco explicativo destacado */}
        <Card className="mb-8 border-primary/30 bg-primary/5 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Como funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm leading-relaxed">
            <p className="text-foreground">Escolha seu nome, selecione um valor e aguarde.</p>
            <p className="text-foreground">Os votos ficam ocultos até todos votarem.</p>
            <div className="pt-3 space-y-1.5 border-t border-border/50">
              <p className="text-muted-foreground"><strong className="text-foreground">0</strong> = a história não exige esforço relevante</p>
              <p className="text-muted-foreground"><strong className="text-foreground">☕</strong> = não vou participar desta estimativa (pausa ou fora do contexto)</p>
            </div>
          </CardContent>
        </Card>

        {/* Seção: Você é */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Você é:</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <select
                value={selectedParticipantId}
                onChange={(e) => {
                  const newId = e.target.value
                  if (newId) {
                    handleClaimParticipant(newId)
                  } else {
                    setSelectedParticipantId("")
                    setNameTaken(false)
                  }
                }}
                disabled={isClaiming}
                className="w-full px-3 py-2 border rounded-md bg-background"
              >
                <option value="">Selecione seu nome</option>
                {state.participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {nameTaken && (
                <p className="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Nome em uso nesta sala
                </p>
              )}
              {selectedParticipant && !nameTaken && (
                <p className="text-sm text-muted-foreground">
                  Selecionado: <strong>{selectedParticipant.name}</strong>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Seção: Votação */}
        {selectedParticipantId && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Votação</CardTitle>
              <CardDescription>
                {isRevealed ? "Rodada revelada" : "Selecione um valor"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isRevealed ? (
                <p className="text-sm text-muted-foreground">
                  Você votou: <strong>{myVoteSummary?.value || "Não votou"}</strong>
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {ALL_VOTE_VALUES.map((value) => (
                    <Button
                      key={value}
                      variant={selectedVote === value ? "default" : "outline"}
                      size="lg"
                      onClick={() => handleVote(value)}
                      disabled={isVoting || !!myVoteSummary?.hasVoted}
                      className={cn(
                        "h-16 text-lg font-semibold",
                        selectedVote === value && "ring-2 ring-primary"
                      )}
                    >
                      {value}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Seção: Status do time */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Status do time ({state.eligibleCount} elegíveis)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {state.participants
                .filter((p) => p.pokerEnabled)
                .map((p) => {
                  const voteStatus = state.voteSummary.find((v) => v.participantId === p.id)
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded border"
                    >
                      <div className="flex items-center gap-2">
                        {voteStatus?.hasVoted ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="font-medium">{p.name}</span>
                        {isRevealed && voteStatus?.value && (
                          <span className="text-sm text-muted-foreground">
                            ({voteStatus.value})
                          </span>
                        )}
                      </div>
                      {voteStatus?.hasVoted ? (
                        <span className="text-sm text-green-600">Votou</span>
                      ) : (
                        <span className="text-sm text-yellow-600">Aguardando</span>
                      )}
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>

        {/* Texto informativo sobre estado da votação */}
        {!isRevealed && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground text-center">
              Aguarde todos os participantes votarem
            </p>
          </div>
        )}

        {/* Botão Revelar */}
        {!isRevealed && (
          <div className="mb-6">
            <Button
              onClick={handleReveal}
              disabled={!allVoted || isRevealing}
              size="lg"
              className="w-full"
            >
              {isRevealing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revelando...
                </>
              ) : (
                "Revelar"
              )}
            </Button>
          </div>
        )}

        {/* Resultados quando revelado */}
        {isRevealed && stats && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Resultados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Tabela de votos */}
                <div>
                  <h3 className="font-semibold mb-2">Votos:</h3>
                  <div className="space-y-1">
                    {state.participants
                      .filter((p) => p.pokerEnabled)
                      .map((p) => {
                        const vote = state.voteSummary.find((v) => v.participantId === p.id)
                        return (
                          <div key={p.id} className="flex justify-between p-2 rounded border">
                            <span>{p.name}</span>
                            <span className="font-semibold">{vote?.value || "Não votou"}</span>
                          </div>
                        )
                      })}
                  </div>
                </div>

                {/* Estatísticas */}
                {stats.numericCount > 0 ? (
                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex justify-between">
                      <span>Média:</span>
                      <span className="font-semibold">{stats.average}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mediana:</span>
                      <span className="font-semibold">{stats.median}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Recomendação Fibonacci:</span>
                      <span className="font-semibold text-primary">{stats.recommendation}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem votos numéricos</p>
                )}

              </div>
            </CardContent>
          </Card>
        )}

        {/* Botão Nova Rodada */}
        {isRevealed && (
          <div className="mb-6">
            <Button
              onClick={handleNewRound}
              disabled={isNewRound}
              size="lg"
              variant="outline"
              className="w-full"
            >
              {isNewRound ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Nova Rodada"
              )}
            </Button>
          </div>
        )}

        {/* Seção: Participantes na votação */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Participantes na votação</CardTitle>
            <CardDescription>Habilite ou desabilite participantes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {state.participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded border"
                >
                  <span className="font-medium">{p.name}</span>
                  <Switch
                    checked={p.pokerEnabled}
                    onCheckedChange={(checked) => handleTogglePokerEnabled(p.id, checked)}
                    disabled={savingIds.has(p.id)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Botão Reiniciar votação */}
        {!isRevealed && (
          <div className="mb-6">
            <Button
              onClick={() => setShowResetDialog(true)}
              disabled={isResetting}
              size="lg"
              variant="outline"
              className="w-full"
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reiniciando...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reiniciar votação
                </>
              )}
            </Button>
          </div>
        )}

        {/* AlertDialog de confirmação para reiniciar votação */}
        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reiniciar votação?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá descartar todos os votos atuais da rodada. Todos os participantes poderão votar novamente do zero.
                <br />
                <br />
                <strong>Esta ação não pode ser desfeita.</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isResetting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResetVoting}
                disabled={isResetting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reiniciando...
                  </>
                ) : (
                  "Reiniciar votação"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
