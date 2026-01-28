/**
 * Hook preparado para adicionar áudio à roleta no futuro
 * 
 * Exemplo de uso futuro:
 * 
 * import useSound from 'use-sound'
 * 
 * const [playSpin] = useSound('/sounds/spin.mp3')
 * const [playWin] = useSound('/sounds/win.mp3')
 * 
 * // No componente:
 * playSpin()
 * // ... após animação
 * playWin()
 */

export function useSound() {
  // Placeholder para implementação futura
  // Quando implementar, usar biblioteca como 'use-sound' ou 'howler'
  
  const playSound = (soundPath?: string) => {
    // Implementação futura
    if (typeof window !== "undefined" && soundPath) {
      // const audio = new Audio(soundPath)
      // audio.play().catch(console.error)
    }
  }

  return [playSound] as const
}
