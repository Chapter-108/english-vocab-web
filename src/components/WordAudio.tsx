import { speak } from '../services/speech'
import type { Settings } from '../types'

export function WordAudio({ word, accent }: { word: string; accent: Settings['accent'] }) {
  return (
    <button onClick={() => speak(word, accent)} className="text-2xl transition-transform active:scale-90" aria-label="play pronunciation">🔊</button>
  )
}
