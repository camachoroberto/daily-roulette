"use client"

import { useCallback, useRef, useEffect } from "react"

const SPIN_SOUND_PATH = "/sounds/spin.mp3"

/**
 * Controles de áudio para um arquivo de som (play, stop com reset).
 * Pensado para uso após interação do usuário (respeita autoplay policies).
 * Fácil de estender para win.mp3 no futuro (ex: useSound('/sounds/win.mp3')).
 */
function useSoundControls(soundPath: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const play = useCallback(() => {
    if (typeof window === "undefined") return
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(soundPath)
      }
      const audio = audioRef.current
      audio.currentTime = 0
      audio.play().catch(console.error)
    } catch (e) {
      console.error("Erro ao tocar áudio:", e)
    }
  }, [soundPath])

  const stop = useCallback(() => {
    try {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    } catch (e) {
      console.error("Erro ao parar áudio:", e)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        audioRef.current = null
      }
    }
  }, [])

  return { play, stop }
}

/** Hook para o som da roleta (spin). Extensível depois para win com useSound('/sounds/win.mp3'). */
export function useSpinSound() {
  return useSoundControls(SPIN_SOUND_PATH)
}
