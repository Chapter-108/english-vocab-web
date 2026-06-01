import type { Settings } from '../types'

/** 用浏览器内置 TTS 朗读单词。iOS Safari 需在用户手势后首次触发。 */
export function speak(word: string, accent: Settings['accent'] = 'us') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(word)
  u.lang = accent === 'uk' ? 'en-GB' : 'en-US'
  u.rate = 0.9
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

export function ttsAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}
