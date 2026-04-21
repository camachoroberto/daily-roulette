"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"

type Particle = {
  id: number
  left: string
  delay: string
  duration: string
  color: string
  size: number
}

interface BirthdayCelebrationProps {
  name: string
  open: boolean
  className?: string
}

/**
 * Confete + mensagem de parabéns (sem revelar aniversário antes do sorteio).
 */
export function BirthdayCelebration({ name, open, className }: BirthdayCelebrationProps) {
  const particles = useMemo<Particle[]>(() => {
    const colors = ["#f472b6", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#fb7185"]
    return Array.from({ length: 48 }, (_, i) => ({
      id: i,
      left: `${(i * 17) % 100}%`,
      delay: `${(i % 12) * 0.05}s`,
      duration: `${2.2 + (i % 5) * 0.15}s`,
      color: colors[i % colors.length],
      size: 6 + (i % 4),
    }))
  }, [])

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const t = setTimeout(() => setMounted(false), 400)
    return () => clearTimeout(t)
  }, [open])

  if (!mounted && !open) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] pointer-events-none flex flex-col items-center justify-center",
        "transition-opacity duration-300",
        open ? "opacity-100" : "opacity-0",
        className
      )}
      aria-live="polite"
    >
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute top-0 rounded-sm animate-confetti-fall"
            style={{
              left: p.left,
              width: p.size,
              height: p.size * 1.4,
              backgroundColor: p.color,
              animationDelay: p.delay,
              animationDuration: p.duration,
              opacity: 0.9,
            }}
          />
        ))}
      </div>
      <div
        className={cn(
          "relative z-10 text-center px-6 py-8 rounded-2xl mx-4 max-w-lg",
          "bg-gradient-to-br from-pink-600/95 via-rose-600/95 to-amber-500/95 text-white shadow-2xl",
          "border border-white/20",
          open ? "scale-100" : "scale-95"
        )}
      >
        <p className="text-sm font-medium uppercase tracking-widest text-white/90 mb-2">Surpresa</p>
        <h2 className="text-3xl md:text-4xl font-bold drop-shadow-lg">Parabéns, {name}!</h2>
      </div>
    </div>
  )
}
