"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { generateSlug } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface RecentRoom {
  slug: string
  name: string
  createdAt: string
}

export default function Home() {
  const [createName, setCreateName] = useState("")
  const [createSlug, setCreateSlug] = useState("")
  const [createPasscode, setCreatePasscode] = useState("")
  const [enterSlug, setEnterSlug] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isEntering, setIsEntering] = useState(false)
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([])
  const { toast } = useToast()

  // Carregar salas recentes do localStorage
  useEffect(() => {
    const stored = localStorage.getItem("recentRooms")
    if (stored) {
      try {
        setRecentRooms(JSON.parse(stored))
      } catch (e) {
        console.error("Erro ao carregar salas recentes:", e)
      }
    }
  }, [])

  // Atualizar slug quando o nome mudar
  useEffect(() => {
    if (createName) {
      setCreateSlug(generateSlug(createName))
    }
  }, [createName])

  const handleCreateRoom = async () => {
    if (!createName.trim() || !createSlug.trim() || !createPasscode.trim()) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: createName.trim(),
          slug: createSlug.trim(),
          passcode: createPasscode.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? data.message ?? "Erro ao criar sala")
      }

      // Adicionar à lista de salas recentes
      const newRoom: RecentRoom = {
        slug: data.data.slug,
        name: data.data.name,
        createdAt: new Date().toISOString(),
      }
      const updated = [newRoom, ...recentRooms.filter((r) => r.slug !== newRoom.slug)].slice(0, 5)
      localStorage.setItem("recentRooms", JSON.stringify(updated))
      setRecentRooms(updated)

      toast({
        title: "Sucesso!",
        description: `Sala "${data.data.name}" criada com sucesso!`,
      })

      // Limpar formulário
      setCreateName("")
      setCreateSlug("")
      setCreatePasscode("")

      // Redirecionar para a sala
      window.location.href = `/room/${data.data.slug}`
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao criar sala",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleEnterRoom = async () => {
    if (!enterSlug.trim()) {
      toast({
        title: "Erro",
        description: "Informe o slug da sala",
        variant: "destructive",
      })
      return
    }

    setIsEntering(true)
    try {
      const response = await fetch(`/api/rooms/${enterSlug.trim()}`)

      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? data.message ?? "Sala não encontrada")
      }

      // Adicionar à lista de salas recentes
      const newRoom: RecentRoom = {
        slug: data.data.slug,
        name: data.data.name,
        createdAt: new Date().toISOString(),
      }
      const updated = [newRoom, ...recentRooms.filter((r) => r.slug !== newRoom.slug)].slice(0, 5)
      localStorage.setItem("recentRooms", JSON.stringify(updated))
      setRecentRooms(updated)

      toast({
        title: "Sucesso!",
        description: `Entrando na sala "${data.data.name}"...`,
      })

      // Redirecionar para a sala
      window.location.href = `/room/${enterSlug.trim()}`
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Sala não encontrada",
        variant: "destructive",
      })
    } finally {
      setIsEntering(false)
    }
  }

  const handleRecentRoomClick = (slug: string) => {
    setEnterSlug(slug)
    window.location.href = `/room/${slug}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Roleta da Daily</h1>
          <p className="text-gray-600">Crie ou entre em uma sala para começar</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Card Criar Sala */}
          <Card>
            <CardHeader>
              <CardTitle>Criar Sala</CardTitle>
              <CardDescription>Crie uma nova sala para sua daily</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="create-name" className="text-sm font-medium mb-2 block">
                  Nome da Sala
                </label>
                <Input
                  id="create-name"
                  placeholder="Ex: Daily Frontend"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  disabled={isCreating}
                  aria-describedby="create-name-description"
                />
                <p id="create-name-description" className="sr-only">
                  Nome que identifica a sala da daily
                </p>
              </div>
              <div>
                <label htmlFor="create-slug" className="text-sm font-medium mb-2 block">
                  Slug (URL)
                </label>
                <Input
                  id="create-slug"
                  placeholder="ex: daily-frontend"
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value)}
                  disabled={isCreating}
                  aria-describedby="create-slug-description"
                />
                <p id="create-slug-description" className="text-xs text-muted-foreground mt-1">
                  Gerado automaticamente, mas você pode editar
                </p>
              </div>
              <div>
                <label htmlFor="create-passcode" className="text-sm font-medium mb-2 block">
                  Senha
                </label>
                <Input
                  id="create-passcode"
                  type="password"
                  placeholder="Digite uma senha"
                  value={createPasscode}
                  onChange={(e) => setCreatePasscode(e.target.value)}
                  disabled={isCreating}
                  aria-describedby="create-passcode-description"
                />
                <p id="create-passcode-description" className="sr-only">
                  Senha para proteger a sala
                </p>
              </div>
              <Button
                onClick={handleCreateRoom}
                disabled={isCreating}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Sala"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Card Entrar em Sala */}
          <Card>
            <CardHeader>
              <CardTitle>Entrar em Sala</CardTitle>
              <CardDescription>Entre em uma sala existente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="enter-slug" className="text-sm font-medium mb-2 block">
                  Slug da Sala
                </label>
                <Input
                  id="enter-slug"
                  placeholder="ex: daily-frontend"
                  value={enterSlug}
                  onChange={(e) => setEnterSlug(e.target.value)}
                  disabled={isEntering}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleEnterRoom()
                    }
                  }}
                  aria-describedby="enter-slug-description"
                />
                <p id="enter-slug-description" className="sr-only">
                  Identificador único da sala que você deseja entrar
                </p>
              </div>
              <Button
                onClick={handleEnterRoom}
                disabled={isEntering}
                className="w-full"
                variant="secondary"
              >
                {isEntering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Salas Recentes */}
        {recentRooms.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Salas Recentes</CardTitle>
              <CardDescription>Suas salas acessadas recentemente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentRooms.map((room) => (
                  <button
                    key={room.slug}
                    onClick={() => handleRecentRoomClick(room.slug)}
                    className="w-full text-left p-3 rounded-md border hover:bg-accent transition-colors"
                  >
                    <div className="font-medium">{room.name}</div>
                    <div className="text-sm text-muted-foreground">{room.slug}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
