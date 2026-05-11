"use client"

import { useCallback, useRef, useEffect } from "react"
import { computeTrackVolume, subscribeAudioPrefs } from "@/lib/audio-preferences"

const SPIN_SOUND_PATH = "/sounds/spin.mp3"
const BIRTHDAY_SOUND_PATH = "/sounds/birthday.mp3"
const POKER_VOTING_SOUND_PATH = "/sounds/poker-voting.mp3"

/** Normalização leve entre arquivos (master já vem baixo por padrão). */
const GAIN_SPIN = 0.88
const GAIN_BIRTHDAY = 0.72
const GAIN_POKER_LOOP = 0.68

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

/** Música de aniversário (uma vez ou conforme arquivo). */
export function useBirthdaySound() {
  return useSoundControls(BIRTHDAY_SOUND_PATH, GAIN_BIRTHDAY)
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
