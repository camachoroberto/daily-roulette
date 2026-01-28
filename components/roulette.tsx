"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface Participant {
  id: string
  name: string
  isPresent: boolean
}

interface RouletteProps {
  participants: Participant[]
  winnerId?: string | null
  onSpinComplete?: () => void
  isSpinning?: boolean
}

export function Roulette({
  participants,
  winnerId,
  onSpinComplete,
  isSpinning = false,
}: RouletteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rotation, setRotation] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const animationRef = useRef<number>()

  // Filtrar apenas participantes presentes
  const presentParticipants = participants.filter((p) => p.isPresent)

  // Ângulo do ponteiro fixo no topo (12h = -π/2)
  const POINTER_ANGLE = -Math.PI / 2

  // Função de easing (ease-out-cubic)
  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3)
  }

  // Calcular rotação final para alinhar vencedor com ponteiro
  // Fórmula: rotationFinal + winnerCenterAngle = pointerAngle (mod 2π)
  // Logo: rotationFinal = pointerAngle - winnerCenterAngle
  const getWinnerAngle = (winnerId: string | null | undefined): number => {
    if (!winnerId || presentParticipants.length === 0) return 0

    const winnerIndex = presentParticipants.findIndex((p) => p.id === winnerId)
    if (winnerIndex === -1) return 0

    const N = presentParticipants.length
    const step = (2 * Math.PI) / N // Ângulo de cada setor
    
    // Ângulo do centro do setor do vencedor (em radianos)
    // Setores começam em 0 (3h), então o centro do setor i é: i*step + step/2
    const winnerCenterAngle = winnerIndex * step + step / 2
    
    // Calcular rotação final: pointerAngle - winnerCenterAngle
    let rotationFinalRad = POINTER_ANGLE - winnerCenterAngle
    
    // Normalizar para [0..2π)
    while (rotationFinalRad < 0) rotationFinalRad += 2 * Math.PI
    while (rotationFinalRad >= 2 * Math.PI) rotationFinalRad -= 2 * Math.PI
    
    // Converter para graus
    const rotationFinalDeg = (rotationFinalRad * 180) / Math.PI
    
    return rotationFinalDeg
  }

  // Desenhar roleta
  const drawRoulette = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentRotation: number
  ) => {
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 2 - 20
    const numSectors = presentParticipants.length

    if (numSectors === 0) {
      // Desenhar círculo vazio
      ctx.clearRect(0, 0, width, height)
      ctx.strokeStyle = "#e5e7eb"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
      ctx.stroke()

      ctx.fillStyle = "#9ca3af"
      ctx.font = "16px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("Adicione participantes presentes", centerX, centerY)
      return
    }

    const sectorAngle = (2 * Math.PI) / numSectors

    // Limpar canvas
    ctx.clearRect(0, 0, width, height)

    // Salvar contexto
    ctx.save()

    // Rotacionar canvas
    ctx.translate(centerX, centerY)
    ctx.rotate((currentRotation * Math.PI) / 180)

    // Desenhar setores (sem offset - começam em 0 = 3h)
    presentParticipants.forEach((participant, index) => {
      const startAngle = index * sectorAngle
      const endAngle = (index + 1) * sectorAngle

      // Cor do setor (alternar cores)
      const isWinner = winnerId === participant.id && !isAnimating
      ctx.fillStyle = isWinner
        ? "#fbbf24" // Amarelo para vencedor
        : index % 2 === 0
        ? "#3b82f6" // Azul
        : "#60a5fa" // Azul claro

      // Desenhar setor
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fill()

      // Borda do setor
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 2
      ctx.stroke()

      // Texto do participante
      ctx.save()
      const textAngle = startAngle + sectorAngle / 2
      ctx.rotate(textAngle)
      ctx.translate(radius * 0.7, 0) // Posição do texto (70% do raio)
      ctx.rotate(Math.PI / 2) // Rotacionar texto para ficar legível

      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 14px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      // Quebrar nome se muito longo
      const maxWidth = radius * 0.4
      const name = participant.name
      if (ctx.measureText(name).width > maxWidth) {
        // Tentar dividir em duas linhas
        const words = name.split(" ")
        if (words.length > 1) {
          const mid = Math.ceil(words.length / 2)
          const line1 = words.slice(0, mid).join(" ")
          const line2 = words.slice(mid).join(" ")
          ctx.fillText(line1, 0, -8)
          ctx.fillText(line2, 0, 8)
        } else {
          // Nome muito longo, truncar
          let truncated = name
          while (ctx.measureText(truncated + "...").width > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1)
          }
          ctx.fillText(truncated + "...", 0, 0)
        }
      } else {
        ctx.fillText(name, 0, 0)
      }

      ctx.restore()
    })

    ctx.restore()

    // Desenhar ponteiro fixo no topo
    ctx.strokeStyle = "#ef4444"
    ctx.fillStyle = "#ef4444"
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(centerX, centerY - radius - 10)
    ctx.lineTo(centerX - 15, centerY - radius - 30)
    ctx.lineTo(centerX + 15, centerY - radius - 30)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Círculo central
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(centerX, centerY, 15, 0, 2 * Math.PI)
    ctx.fill()
    ctx.strokeStyle = "#ef4444"
    ctx.lineWidth = 3
    ctx.stroke()
  }

  // Animar roleta
  useEffect(() => {
    if (!isSpinning || !winnerId || presentParticipants.length === 0) {
      return
    }

    setIsAnimating(true)
    const startRotation = rotation
    const targetAngleDeg = getWinnerAngle(winnerId)
    
    // Normalizar rotação atual para 0-360
    const normalizedStart = ((startRotation % 360) + 360) % 360
    
    // Calcular diferença até o target (considerando que pode dar volta completa)
    let diff = targetAngleDeg - normalizedStart
    if (diff < 0) diff += 360
    
    // Adicionar voltas extras para efeito visual
    const extraSpins = 5 // Número de voltas completas
    const totalRotation = extraSpins * 360 + diff
    
    const startTime = Date.now()
    const duration = 3000 // 3 segundos

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutCubic(progress)
      
      const currentRotation = startRotation + totalRotation * easedProgress
      setRotation(currentRotation)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
        if (onSpinComplete) {
          onSpinComplete()
        }
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isSpinning, winnerId])

  // Redesenhar quando necessário
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Ajustar tamanho do canvas
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    drawRoulette(ctx, rect.width, rect.height, rotation)
  }, [rotation, participants, winnerId, isAnimating, presentParticipants.length])

  // Redesenhar ao redimensionar
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)

      drawRoulette(ctx, rect.width, rect.height, rotation)
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [rotation])

  return (
    <div className="w-full aspect-square max-w-md mx-auto">
      <canvas
        ref={canvasRef}
        className={cn(
          "w-full h-full",
          isAnimating && "transition-none"
        )}
        style={{ touchAction: "none" }}
      />
    </div>
  )
}
