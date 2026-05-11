"use client"

import { Button } from "@/components/ui/button"
import { useAudioPreferences } from "@/hooks/use-audio-preferences"
import { cn } from "@/lib/utils"
import { Volume2, VolumeX } from "lucide-react"
import type { CSSProperties } from "react"

type AudioVolumeControlProps = {
  className?: string
  compact?: boolean
}

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)))
}

/**
 * Controle global de volume (persistido) + mute. Afeta todos os sons do app.
 * Faixa e thumb estilizados via `globals.css` (.volume-slider-input) para WebKit e Firefox.
 */
export function AudioVolumeControl({ className, compact }: AudioVolumeControlProps) {
  const { volume, muted, setVolume, setMuted, toggleMute } = useAudioPreferences()

  /** 0–100 alinhado ao volume real 0–1 (ex.: 0.6 → 60). Com mute, UI em 0 mas volume guardado. */
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

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={pct}
        onChange={(e) => applyPct(Number(e.target.value))}
        className="volume-slider-input"
        style={{ "--volume-pct": `${pct}%` } as CSSProperties}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={muted ? "Silenciado" : `${pct}%`}
        aria-label="Volume"
      />

      {!compact && (
        <span className="tabular-nums text-xs text-muted-foreground w-8 shrink-0 text-right">
          {muted ? "—" : `${pct}%`}
        </span>
      )}
    </div>
  )
}
