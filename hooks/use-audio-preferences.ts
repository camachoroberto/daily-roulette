"use client"

import { useEffect, useState } from "react"
import { getAudioPrefs, setAudioPrefs, subscribeAudioPrefs, type AudioPrefs } from "@/lib/audio-preferences"

export function useAudioPreferences() {
  const [prefs, setPrefs] = useState<AudioPrefs>(() => getAudioPrefs())

  useEffect(() => {
    return subscribeAudioPrefs(() => {
      setPrefs(getAudioPrefs())
    })
  }, [])

  return {
    /** 0–100 */
    volume: prefs.volume,
    muted: prefs.muted,
    /** 0–1 para uso programático (ex.: comparar com elemento de áudio). */
    effectiveVolume: prefs.muted ? 0 : prefs.volume / 100,
    /** Define volume 0–100. */
    setVolume: (volume: number) => setAudioPrefs({ volume }),
    setMuted: (muted: boolean) => setAudioPrefs({ muted }),
    toggleMute: () => {
      const p = getAudioPrefs()
      setAudioPrefs({ muted: !p.muted })
    },
  }
}
