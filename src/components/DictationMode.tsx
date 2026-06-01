import { useEffect, useRef, useState } from 'react'
import type { Word, Settings } from '../types'
import { initInput, inputChar, type InputState } from '../logic/wordInput'
import { speak } from '../services/speech'

export function DictationMode({ word, settings, onResult }: {
  word: Word; settings: Settings; onResult: (correct: boolean) => void
}) {
  const [state, setState] = useState<InputState>(() => initInput(word.name, settings.ignoreCase))
  const [wrong, setWrong] = useState(false)
  const everWrong = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setState(initInput(word.name, settings.ignoreCase)); everWrong.current = false
    speak(word.name, settings.accent)
    inputRef.current?.focus()
  }, [word, settings.ignoreCase, settings.accent])

  // ref 持有最新 state，避免 onKey 闭包拿到旧值（软键盘一次多字符时关键）
  const stateRef = useRef(state); stateRef.current = state
  function onKey(ch: string) {
    const next = inputChar(stateRef.current, ch)
    if (next.error) { everWrong.current = true; setWrong(true); setTimeout(() => setWrong(false), 250); return }
    stateRef.current = next; setState(next)
    if (next.complete) setTimeout(() => onResult(!everWrong.current), 500)
  }

  return (
    <div className="flex flex-col items-center gap-4" onClick={() => inputRef.current?.focus()}>
      <button onClick={() => speak(word.name, settings.accent)} className="text-4xl transition-transform active:scale-90">🔊</button>
      <div className={`text-3xl font-mono tracking-widest transition-colors ${wrong ? 'text-red-500' : ''}`}>
        {word.name.split('').map((_, i) => (
          <span key={i} className={i < state.typed.length ? 'text-slate-800' : 'text-slate-300'}>
            {i < state.typed.length ? state.typed[i] : '_'}
          </span>
        ))}
      </div>
      <div className="text-slate-500">{word.trans[0]}</div>
      <input
        ref={inputRef} autoFocus inputMode="text" autoCapitalize="none" autoCorrect="off" spellCheck={false}
        className="opacity-0 absolute h-0 w-0" value="" onChange={() => {}}
        onBeforeInput={(e) => {
          const data = (e.nativeEvent as InputEvent).data
          if (data) for (const ch of data) onKey(ch)
        }}
      />
    </div>
  )
}
