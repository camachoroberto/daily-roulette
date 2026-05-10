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

  const presentParticipants = participants.filter((p) => p.isPresent)

  const POINTER_ANGLE = -Math.PI / 2

  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3)
  }

  const getWinnerAngle = (winnerId: string | null | undefined): number => {
    if (!winnerId || presentParticipants.length === 0) return 0

    const winnerIndex = presentParticipants.findIndex((p) => p.id === winnerId)
    if (winnerIndex === -1) return 0

    const N = presentParticipants.length
    const step = (2 * Math.PI) / N

    const winnerCenterAngle = winnerIndex * step + step / 2

    let rotationFinalRad = POINTER_ANGLE - winnerCenterAngle

    while (rotationFinalRad < 0) rotationFinalRad += 2 * Math.PI
    while (rotationFinalRad >= 2 * Math.PI) rotationFinalRad -= 2 * Math.PI

    const rotationFinalDeg = (rotationFinalRad * 180) / Math.PI

    return rotationFinalDeg
  }

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

    ctx.clearRect(0, 0, width, height)

    ctx.save()

    ctx.translate(centerX, centerY)
    ctx.rotate((currentRotation * Math.PI) / 180)

    const isAnimatingState = isAnimating
    const winnerIndex = !isAnimatingState && winnerId
      ? presentParticipants.findIndex((p) => p.id === winnerId)
      : -1

    presentParticipants.forEach((participant, index) => {
      const startAngle = index * sectorAngle
      const endAngle = (index + 1) * sectorAngle
      const isWinner = index === winnerIndex

      if (isWinner) {
        ctx.fillStyle = "hsl(25, 95%, 53%)"
        ctx.shadowBlur = 0
      } else {
        ctx.fillStyle = index % 2 === 0
          ? "hsl(220, 90%, 25%)"
          : "hsl(220, 60%, 45%)"
      }

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fill()
      ctx.shadowBlur = 0

      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.save()
      const textAngle = startAngle + sectorAngle / 2
      ctx.rotate(textAngle)
      ctx.translate(radius * 0.7, 0)
      ctx.rotate(Math.PI / 2)

      ctx.fillStyle = "#ffffff"
      ctx.font = "600 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      ctx.shadowColor = "rgba(0, 0, 0, 0.3)"
      ctx.shadowBlur = 2
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 1

      const maxWidth = radius * 0.4
      const name = participant.name
      if (ctx.measureText(name).width > maxWidth) {
        const words = name.split(" ")
        if (words.length > 1) {
          const mid = Math.ceil(words.length / 2)
          const line1 = words.slice(0, mid).join(" ")
          const line2 = words.slice(mid).join(" ")
          ctx.fillText(line1, 0, -8)
          ctx.fillText(line2, 0, 8)
        } else {
          let truncated = name
          while (ctx.measureText(truncated + "...").width > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1)
          }
          ctx.fillText(truncated + "...", 0, 0)
        }
      } else {
        ctx.fillText(name, 0, 0)
      }

      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0

      ctx.restore()
    })

    ctx.restore()

    ctx.fillStyle = "hsl(220, 90%, 25%)"
    ctx.strokeStyle = "hsl(220, 90%, 25%)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(centerX, centerY - radius - 5)
    ctx.lineTo(centerX - 12, centerY - radius - 25)
    ctx.lineTo(centerX + 12, centerY - radius - 25)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(centerX, centerY, 12, 0, 2 * Math.PI)
    ctx.fill()
    ctx.strokeStyle = "hsl(220, 90%, 25%)"
    ctx.lineWidth = 2
    ctx.stroke()
  }

  useEffect(() => {
    if (!isSpinning || !winnerId || presentParticipants.length === 0) {
      return
    }

    setIsAnimating(true)
    const startRotation = rotation
    const targetAngleDeg = getWinnerAngle(winnerId)

    const normalizedStart = ((startRotation % 360) + 360) % 360

    let diff = targetAngleDeg - normalizedStart
    if (diff < 0) diff += 360

    const extraSpins = 5
    const totalRotation = extraSpins * 360 + diff

    const startTime = Date.now()
    const duration = 6000

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

  useEffect(() => {
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
  }, [rotation, participants, winnerId, isAnimating, presentParticipants.length])

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
