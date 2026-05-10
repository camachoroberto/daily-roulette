"use client"

import { useEffect, useMemo, useState, type CSSProperties } from "react"
import { cn } from "@/lib/utils"

type Particle = {
  id: number
  left: string
  delay: string
  duration: string
  color: string
  size: number
}

type Sparkle = {
  id: number
  left: string
  top: string
  delay: string
  tx: string
  ty: string
}

interface BirthdayCelebrationProps {
  name: string
  open: boolean
  className?: string
}

/**
 * Celebração pós-sorteio: confete, brilho e mensagem — só após o resultado.
 */
export function BirthdayCelebration({ name, open, className }: BirthdayCelebrationProps) {
  const particles = useMemo<Particle[]>(() => {
    const colors = ["#f472b6", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#fb7185"]
    return Array.from({ length: 56 }, (_, i) => ({
      id: i,
      left: `${(i * 17) % 100}%`,
      delay: `${(i % 12) * 0.05}s`,
      duration: `${2.2 + (i % 5) * 0.15}s`,
      color: colors[i % colors.length],
      size: 6 + (i % 4),
    }))
  }, [])

  const sparkles = useMemo<Sparkle[]>(() => {
    return Array.from({ length: 14 }, (_, i) => ({
      id: i,
      left: `${8 + (i * 13) % 84}%`,
      top: `${12 + (i * 7) % 40}%`,
      delay: `${(i % 6) * 0.12}s`,
      tx: `${-30 + (i % 5) * 15}px`,
      ty: `${-40 - (i % 4) * 8}px`,
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
      <div
        className={cn(
          "absolute inset-0 overflow-hidden",
          open && "animate-celebration-glow bg-gradient-to-b from-amber-400/10 via-fuchsia-500/5 to-transparent"
        )}
      />
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
      <div className="absolute inset-0 overflow-hidden">
        {sparkles.map((s) => (
          <span
            key={s.id}
            className="absolute h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.95)] animate-sparkle-drift"
            style={
              {
                left: s.left,
                top: s.top,
                animationDelay: s.delay,
                "--tx": s.tx,
                "--ty": s.ty,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div
        className={cn(
          "relative z-10 text-center px-6 py-8 rounded-2xl mx-4 max-w-lg",
          "bg-gradient-to-br from-pink-600/95 via-rose-600/95 to-amber-500/95 text-white shadow-2xl",
          "border border-white/20",
          open ? "scale-100 animate-celebration-glow" : "scale-95"
        )}
      >
        <p className="text-sm font-medium uppercase tracking-widest text-white/90 mb-2">Surpresa</p>
        <h2 className="text-3xl md:text-4xl font-bold drop-shadow-lg">Parabéns, {name}!</h2>
      </div>
    </div>
  )
}
