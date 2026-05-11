"use client"

import { useCallback, useRef, useEffect } from "react"
import { computeTrackVolume, subscribeAudioPrefs } from "@/lib/audio-preferences"

const SPIN_SOUND_PATH = "/sounds/spin.mp3"
const BIRTHDAY_SOUND_PATH = "/sounds/birthday.mp3"
const POKER_VOTING_SOUND_PATH = "/sounds/poker-voting.mp3"

/** Ganho unitário: o volume global (slider) aplica-se igualmente a todas as faixas. */
const GAIN_SPIN = 1
const GAIN_BIRTHDAY = 1
const GAIN_POKER_LOOP = 1

const ALL_SOUND_PATHS = [SPIN_SOUND_PATH, BIRTHDAY_SOUND_PATH, POKER_VOTING_SOUND_PATH] as const

/**
 * Pré-carrega os MP3 no navegador para o primeiro play responder mais rápido.
 */
export function useWarmupAppSounds(): void {
  useEffect(() => {
    const audios = ALL_SOUND_PATHS.map((src) => {
      const a = new Audio()
      a.preload = "auto"
      a.src = src
      void a.load()
      return a
    })
    return () => {
      audios.forEach((a) => {
        a.pause()
        a.removeAttribute("src")
      })
    }
  }, [])
}

/**
 * Controles de áudio para um arquivo de som (play, stop com reset).
 * Instância criada no mount para reduzir atraso no primeiro play (intro sincronizada).
 */
function useSoundControls(soundPath: string, trackGain: number) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const audio = new Audio(soundPath)
    audio.preload = "auto"
    audioRef.current = audio
    void audio.load()

    return () => {
      audio.pause()
      audio.removeAttribute("src")
      if (audioRef.current === audio) {
        audioRef.current = null
      }
    }
  }, [soundPath])

  const applyLevel = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.volume = computeTrackVolume(trackGain)
    }
  }, [trackGain])

  useEffect(() => {
    applyLevel()
    return subscribeAudioPrefs(applyLevel)
  }, [applyLevel])

  const play = useCallback(() => {
    try {
      const audio = audioRef.current
      if (!audio) return
      audio.volume = computeTrackVolume(trackGain)
      audio.currentTime = 0
      void audio.play().catch(console.error)
    } catch (e) {
      console.error("Erro ao tocar áudio:", e)
    }
  }, [trackGain])

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

  return { play, stop }
}

/** Som único da roleta (spin). */
export function useSpinSound() {
  return useSoundControls(SPIN_SOUND_PATH, GAIN_SPIN)
}

export type BirthdaySoundApi = {
  play: () => void
  stop: () => void
  /** Registra callback para `ended` da faixa (uma instância de áudio). Retorna unsubscribe. */
  subscribeEnded: (callback: () => void) => () => void
}

/**
 * Música de aniversário: mesma instância para play/stop + notificação ao terminar a faixa.
 */
export function useBirthdaySound(): BirthdaySoundApi {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const endedListenersRef = useRef<Set<() => void>>(new Set())

  useEffect(() => {
    if (typeof window === "undefined") return
    const audio = new Audio(BIRTHDAY_SOUND_PATH)
    audio.preload = "auto"
    audioRef.current = audio
    void audio.load()

    const onEnded = () => {
      const cbs = [...endedListenersRef.current]
      cbs.forEach((cb) => {
        try {
          cb()
        } catch (e) {
          console.error(e)
        }
      })
    }
    audio.addEventListener("ended", onEnded)

    return () => {
      audio.removeEventListener("ended", onEnded)
      audio.pause()
      audio.removeAttribute("src")
      endedListenersRef.current.clear()
      if (audioRef.current === audio) {
        audioRef.current = null
      }
    }
  }, [])

  const applyLevel = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.volume = computeTrackVolume(GAIN_BIRTHDAY)
    }
  }, [])

  useEffect(() => {
    applyLevel()
    return subscribeAudioPrefs(applyLevel)
  }, [applyLevel])

  const play = useCallback(() => {
    try {
      const audio = audioRef.current
      if (!audio) return
      audio.volume = computeTrackVolume(GAIN_BIRTHDAY)
      audio.currentTime = 0
      void audio.play().catch(console.error)
    } catch (e) {
      console.error("Erro ao tocar áudio:", e)
    }
  }, [])

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

  const subscribeEnded = useCallback((callback: () => void) => {
    endedListenersRef.current.add(callback)
    return () => {
      endedListenersRef.current.delete(callback)
    }
  }, [])

  return { play, stop, subscribeEnded }
}

/**
 * Áudio em loop com uma única instância; evita múltiplos play e restart por re-render.
 */
export function useLoopingSound(soundPath: string, trackGain: number) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const a = new Audio(soundPath)
    a.preload = "auto"
    a.loop = true
    audioRef.current = a
    void a.load()

    return () => {
      a.pause()
      a.removeAttribute("src")
      if (audioRef.current === a) {
        audioRef.current = null
      }
    }
  }, [soundPath])

  const applyLevel = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.volume = computeTrackVolume(trackGain)
    }
  }, [trackGain])

  useEffect(() => {
    applyLevel()
    return subscribeAudioPrefs(applyLevel)
  }, [applyLevel])

  const start = useCallback(() => {
    try {
      const a = audioRef.current
      if (!a) return
      a.loop = true
      a.volume = computeTrackVolume(trackGain)
      if (a.paused) {
        void a.play().catch(console.error)
      }
    } catch (e) {
      console.error("Erro ao iniciar áudio em loop:", e)
    }
  }, [trackGain])

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

  return { start, stop }
}

/** Música ambiente durante votação do Planning Poker. */
export function usePokerVotingSound() {
  return useLoopingSound(POKER_VOTING_SOUND_PATH, GAIN_POKER_LOOP)
}
