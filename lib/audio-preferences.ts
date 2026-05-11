/**
 * Preferências globais de áudio (volume + mute), persistidas em localStorage.
 * Volume em escala única 0–100 (UI, persistência e valor “humano”); HTMLAudioElement usa /100.
 */

export const AUDIO_STORAGE_KEY = "daily-roulette:audio:v2"
const LEGACY_AUDIO_STORAGE_KEY = "daily-roulette:audio:v1"

export type AudioPrefs = {
  /** Volume 0–100 (ex.: 60 → áudio 0.6). */
  volume: number
  muted: boolean
}

const DEFAULTS: AudioPrefs = {
  volume: 60,
  muted: false,
}

function clamp100(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)))
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

/**
 * Aceita número salvo como 0–100 ou, por compatibilidade, fração 0–1.
 */
function normalizeVolumeFromStorage(v: unknown): number {
  if (typeof v !== "number" || Number.isNaN(v)) return DEFAULTS.volume
  if (v >= 0 && v <= 1) return clamp100(Math.round(v * 100))
  return clamp100(v)
}

let cache: AudioPrefs | null = null
const listeners = new Set<() => void>()

function notify(): void {
  listeners.forEach((fn) => fn())
}

function readAndMigrateStorage(): AudioPrefs {
  if (typeof window === "undefined") {
    return { ...DEFAULTS }
  }
  try {
    const v2raw = localStorage.getItem(AUDIO_STORAGE_KEY)
    if (v2raw) {
      const p = JSON.parse(v2raw) as Partial<AudioPrefs>
      return {
        volume: normalizeVolumeFromStorage(p.volume),
        muted: typeof p.muted === "boolean" ? p.muted : DEFAULTS.muted,
      }
    }

    const v1raw = localStorage.getItem(LEGACY_AUDIO_STORAGE_KEY)
    if (v1raw) {
      const p = JSON.parse(v1raw) as Partial<AudioPrefs>
      const prefs: AudioPrefs = {
        volume: normalizeVolumeFromStorage(p.volume),
        muted: typeof p.muted === "boolean" ? p.muted : DEFAULTS.muted,
      }
      try {
        localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(prefs))
        localStorage.removeItem(LEGACY_AUDIO_STORAGE_KEY)
      } catch {
        /* ignore */
      }
      return prefs
    }
  } catch {
    /* fallthrough */
  }
  return { ...DEFAULTS }
}

export function getAudioPrefs(): AudioPrefs {
  if (typeof window === "undefined") {
    return { ...DEFAULTS }
  }
  if (!cache) {
    cache = readAndMigrateStorage()
  }
  return cache
}

export function setAudioPrefs(patch: Partial<AudioPrefs>): void {
  if (typeof window === "undefined") return
  const cur = getAudioPrefs()
  cache = {
    volume:
      patch.volume !== undefined ? clamp100(patch.volume) : cur.volume,
    muted: patch.muted !== undefined ? patch.muted : cur.muted,
  }
  try {
    localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(cache))
  } catch {
    /* ignore quota / private mode */
  }
  notify()
}

/** Volume efetivo 0–1 para HTMLAudioElement (após mute). */
export function masterVolume01(): number {
  const p = getAudioPrefs()
  return p.muted ? 0 : clamp01(p.volume / 100)
}

/**
 * Volume final do elemento: master (0–1) × ganho da faixa.
 */
export function computeTrackVolume(trackGain: number): number {
  return clamp01(masterVolume01() * trackGain)
}

export function subscribeAudioPrefs(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  listeners.add(cb)
  return () => listeners.delete(cb)
}
