/**
 * Preferências globais de áudio (volume + mute), persistidas em localStorage.
 * Usado por roleta, aniversário e Planning Poker — uma única fonte de verdade.
 */

export const AUDIO_STORAGE_KEY = "daily-roulette:audio:v1"

export type AudioPrefs = {
  volume: number
  muted: boolean
}

const DEFAULTS: AudioPrefs = {
  /** Volume inicial mais baixo para não assustar em ambientes de time. */
  volume: 0.32,
  muted: false,
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

let cache: AudioPrefs | null = null
const listeners = new Set<() => void>()

function notify(): void {
  listeners.forEach((fn) => fn())
}

export function getAudioPrefs(): AudioPrefs {
  if (typeof window === "undefined") {
    return { ...DEFAULTS }
  }
  if (!cache) {
    try {
      const raw = localStorage.getItem(AUDIO_STORAGE_KEY)
      if (raw) {
        const p = JSON.parse(raw) as Partial<AudioPrefs>
        cache = {
          volume: clamp01(typeof p.volume === "number" ? p.volume : DEFAULTS.volume),
          muted: typeof p.muted === "boolean" ? p.muted : DEFAULTS.muted,
        }
      } else {
        cache = { ...DEFAULTS }
      }
    } catch {
      cache = { ...DEFAULTS }
    }
  }
  return cache
}

export function setAudioPrefs(patch: Partial<AudioPrefs>): void {
  if (typeof window === "undefined") return
  const cur = getAudioPrefs()
  cache = {
    volume: patch.volume !== undefined ? clamp01(patch.volume) : cur.volume,
    muted: patch.muted !== undefined ? patch.muted : cur.muted,
  }
  try {
    localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(cache))
  } catch {
    /* ignore quota / private mode */
  }
  notify()
}

/** Volume efetivo 0–1 após mute. */
export function effectiveMasterVolume(): number {
  const p = getAudioPrefs()
  return p.muted ? 0 : p.volume
}

/**
 * Volume final do elemento de mídia: master × ganho da faixa (normalização leve entre arquivos).
 */
export function computeTrackVolume(trackGain: number): number {
  return clamp01(effectiveMasterVolume() * trackGain)
}

export function subscribeAudioPrefs(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  listeners.add(cb)
  return () => listeners.delete(cb)
}
