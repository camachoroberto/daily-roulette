"use client"

import { Button } from "@/components/ui/button"
import { useAudioPreferences } from "@/hooks/use-audio-preferences"
import { cn } from "@/lib/utils"
import { Volume2, VolumeX } from "lucide-react"

type AudioVolumeControlProps = {
  className?: string
  compact?: boolean
}

/**
 * Controle global de volume (persistido) + mute. Afeta todos os sons do app.
 */
export function AudioVolumeControl({ className, compact }: AudioVolumeControlProps) {
  const { volume, muted, setVolume, setMuted, toggleMute } = useAudioPreferences()

  const pct = Math.round(volume * 100)

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        compact ? "max-w-[200px]" : "max-w-[220px]",
        className
      )}
      title="Volume do som"
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
        value={muted ? 0 : pct}
        onChange={(e) => {
          const next = Number(e.target.value) / 100
          setVolume(next)
          if (next > 0 && muted) setMuted(false)
        }}
        className={cn(
          "h-2 w-full cursor-pointer accent-primary",
          "disabled:opacity-50"
        )}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={muted ? 0 : pct}
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
