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
    volume: prefs.volume,
    muted: prefs.muted,
    effectiveVolume: prefs.muted ? 0 : prefs.volume,
    setVolume: (volume: number) => setAudioPrefs({ volume }),
    setMuted: (muted: boolean) => setAudioPrefs({ muted }),
    toggleMute: () => {
      const p = getAudioPrefs()
      setAudioPrefs({ muted: !p.muted })
    },
  }
}
