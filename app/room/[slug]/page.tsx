"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Roulette } from "@/components/roulette"
import { Loader2, Trash2, RotateCcw, LogOut, X, Play } from "lucide-react"

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
  const [winnerId, setWinnerId] = useState<string | null>(null)
  const [winnerName, setWinnerName] = useState<string | null>(null)
  const [pendingSpin, setPendingSpin] = useState<{
    winner: { id: string; name: string; winCount: number }
    spinHistory: HistoryItem | null
  } | null>(null)

  // Verificar autenticação e carregar dados
  useEffect(() => {
    loadRoomData()
  }, [params.slug])

  const loadRoomData = async () => {
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

      // Carregar dados (participantes e histórico não precisam de autenticação para leitura)
      await loadParticipants()
      await loadHistory()
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadParticipants = async () => {
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
  }

  const loadHistory = async () => {
    try {
      const response = await fetch(`/api/rooms/${params.slug}/history?limit=50`)
      const data = await response.json()

      if (response.ok && data.ok) {
        setHistory(data.data)
      }
    } catch (error) {
      console.error("Erro ao carregar histórico:", error)
    }
  }

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

  const handleSpin = async () => {
    if (presentCount === 0) {
      toast({
        title: "Atenção",
        description: "Adicione participantes presentes para sortear",
        variant: "destructive",
      })
      return
    }

    setIsSpinning(true)
    setWinnerId(null)

    try {
      const response = await fetch(`/api/rooms/${params.slug}/spin`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        if (response.status === 401 || response.status === 403) {
          setShowAuthDialog(true)
          setIsSpinning(false)
          return
        }

        // Tratamento específico para erro de participantes
        if (data.code === "NO_PRESENT_PARTICIPANTS") {
          toast({
            title: "Atenção",
            description: "Não há participantes presentes para sortear",
            variant: "destructive",
          })
          setIsSpinning(false)
          return
        }

        throw new Error(data.message || "Erro ao sortear")
      }

      // Guardar resultado em pendingSpin (NÃO atualizar histórico ainda)
      setPendingSpin({
        winner: data.data.winner,
        spinHistory: data.data.spinHistory || null,
      })

      // Definir vencedor para animação (sem atualizar histórico/toast)
      setWinnerId(data.data.winner.id)
      setWinnerName(data.data.winner.name)
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao sortear",
        variant: "destructive",
      })
      setIsSpinning(false)
      setWinnerId(null)
      setWinnerName(null)
      setPendingSpin(null)
    }
  }

  const handleSpinComplete = async () => {
    // Commit do pendingSpin: atualizar histórico e contadores APÓS animação
    if (pendingSpin) {
      // Atualizar histórico com o item do spin
      if (pendingSpin.spinHistory) {
        setHistory((prev) => [pendingSpin.spinHistory!, ...prev].slice(0, 50))
      }

      // Atualizar participantes (para atualizar winCount)
      await loadParticipants()

      // Mostrar toast de sucesso
      toast({
        title: "Sorteio realizado!",
        description: `${pendingSpin.winner.name} foi sorteado!`,
      })

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    )
  }

  if (!room) {
    return null
  }

  const presentCount = participants.filter((p) => p.isPresent).length
  const totalWins = participants.reduce((sum, p) => sum + p.winCount, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{room.name}</h1>
            <p className="text-gray-600 mt-1">Slug: {room.slug}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>

        {/* Layout 2 colunas */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Coluna Esquerda - Participantes */}
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
                <Input
                  placeholder="Nome do participante"
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddParticipant()
                    }
                  }}
                  disabled={isAddingParticipant}
                />
                <Button
                  onClick={handleAddParticipant}
                  disabled={isAddingParticipant}
                >
                  {isAddingParticipant ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Adicionar"
                  )}
                </Button>
              </div>

              {/* Lista de participantes */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {participants.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum participante ainda
                  </p>
                ) : (
                  participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Switch
                          checked={participant.isPresent}
                          onCheckedChange={() => handleTogglePresence(participant.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{participant.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Sorteado: {participant.winCount} vez{participant.winCount !== 1 ? "es" : ""}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteParticipant(participant.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Coluna Direita - Roleta e Histórico */}
          <div className="space-y-6">
            {/* Roleta */}
            <Card>
              <CardHeader>
                <CardTitle>Roleta</CardTitle>
                <CardDescription>
                  {presentCount > 0
                    ? `${presentCount} participante${presentCount !== 1 ? "s" : ""} presente${presentCount !== 1 ? "s" : ""}`
                    : "Adicione participantes presentes para sortear"}
                </CardDescription>
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
                  disabled={isSpinning || presentCount === 0}
                  className="w-full"
                  size="lg"
                >
                  {isSpinning ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Girando...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5" />
                      Girar Roleta
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Histórico */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Sorteios</CardTitle>
                <CardDescription>Últimos {history.length} sorteios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {history.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum sorteio ainda
                    </p>
                  ) : (
                    history.map((item) => (
                      <div
                        key={item.id}
                        className="p-2 border rounded-md text-sm"
                      >
                        <div className="font-medium">{item.participant.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString("pt-BR")}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
                <CardDescription>Ações irreversíveis</CardDescription>
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
