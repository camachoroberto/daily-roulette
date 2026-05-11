"use client"

import { Button } from "@/components/ui/button"
import { useAudioPreferences } from "@/hooks/use-audio-preferences"
import { cn } from "@/lib/utils"
import { Volume2, VolumeX } from "lucide-react"

type AudioVolumeControlProps = {
  className?: string
  compact?: boolean
}

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)))
}

/**
 * Controle global de volume (persistido) + mute. Afeta todos os sons do app.
 * Slider com trilha preenchida por % — posição visual = valor 0–100 = volume 0–1.
 */
export function AudioVolumeControl({ className, compact }: AudioVolumeControlProps) {
  const { volume, muted, setVolume, setMuted, toggleMute } = useAudioPreferences()

  /** 0–100 alinhado ao volume real em 0–1 (ex.: 0.6 → 60). */
  const pct = muted ? 0 : clampPct(volume * 100)

  const applyPct = (nextPct: number) => {
    const v = clampPct(nextPct) / 100
    setVolume(v)
    if (v > 0 && muted) setMuted(false)
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        compact ? "max-w-[200px]" : "max-w-[220px]",
        className
      )}
      title={muted ? "Som silenciado (volume guardado)" : `Volume: ${pct}%`}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => toggleMute()}
        aria-label={muted ? "Ativar som" : "Silenciar"}
      >
        {muted ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
      </Button>

      <div className="relative flex h-9 min-w-[88px] flex-1 items-center">
        <div
          className="pointer-events-none absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-muted"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-l-full bg-primary transition-[width] duration-75"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={pct}
          onChange={(e) => applyPct(Number(e.target.value))}
          className="absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-valuetext={muted ? "Silenciado" : `${pct}%`}
          aria-label="Volume"
        />
      </div>

      {!compact && (
        <span className="tabular-nums text-xs text-muted-foreground w-8 shrink-0 text-right">
          {muted ? "—" : `${pct}%`}
        </span>
      )}
    </div>
  )
}
