"use client"

import { useCallback, useRef, useEffect } from "react"

const SPIN_SOUND_PATH = "/sounds/spin.mp3"
const BIRTHDAY_SOUND_PATH = "/sounds/birthday.mp3"
const POKER_VOTING_SOUND_PATH = "/sounds/poker-voting.mp3"

/**
 * Controles de áudio para um arquivo de som (play, stop com reset).
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

/** Som único da roleta (spin). */
export function useSpinSound() {
  return useSoundControls(SPIN_SOUND_PATH)
}

/** Música de aniversário (uma vez ou loop curto conforme arquivo). */
export function useBirthdaySound() {
  return useSoundControls(BIRTHDAY_SOUND_PATH)
}

/**
 * Áudio em loop com uma única instância; evita múltiplos play e restart por re-render.
 */
export function useLoopingSound(soundPath: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const start = useCallback(() => {
    if (typeof window === "undefined") return
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(soundPath)
        audioRef.current.loop = true
      }
      const a = audioRef.current
      a.loop = true
      if (a.paused) {
        void a.play().catch(console.error)
      }
    } catch (e) {
      console.error("Erro ao iniciar áudio em loop:", e)
    }
  }, [soundPath])

  const stop = useCallback(() => {
    try {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    } catch (e) {
      console.error("Erro ao parar áudio em loop:", e)
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

  return { start, stop }
}

/** Música ambiente durante votação do Planning Poker. */
export function usePokerVotingSound() {
  return useLoopingSound(POKER_VOTING_SOUND_PATH)
}
