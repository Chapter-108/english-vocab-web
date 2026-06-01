import { useEffect, useRef, useState } from 'react'
import type { Word, Settings } from '../types'
import { initInput, inputChar, type InputState } from '../logic/wordInput'
import { WordAudio } from './WordAudio'

export function SpellingMode({ word, settings, onResult }: {
  word: Word; settings: Settings; onResult: (correct: boolean) => void
}) {
  const [state, setState] = useState<InputState>(() => initInput(word.name, settings.ignoreCase))
  const [wrong, setWrong] = useState(false)
  const everWrong = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setState(initInput(word.name, settings.ignoreCase)); everWrong.current = false
    inputRef.current?.focus()
  }, [word, settings.ignoreCase])

  const stateRef = useRef(state); stateRef.current = state
  function onKey(ch: string) {
    const next = inputChar(stateRef.current, ch)
    if (next.error) { everWrong.current = true; setWrong(true); setTimeout(() => setWrong(false), 250); return }
    stateRef.current = next; setState(next)
    if (next.complete) setTimeout(() => onResult(!everWrong.current), 400)
  }

  return (
    <div className="flex flex-col items-center gap-4" onClick={() => inputRef.current?.focus()}>
      <div className={`text-4xl font-mono tracking-widest transition-colors ${wrong ? 'text-red-500' : ''}`}>
        {word.name.split('').map((c, i) => (
          <span key={i} className={i < state.typed.length ? 'text-slate-800' : 'text-slate-300'}>
            {i < state.typed.length ? state.typed[i] : c}
          </span>
        ))}
      </div>
      <div className="text-slate-500 flex items-center gap-2">{word.usphone && `/${word.usphone}/`} <WordAudio word={word.name} accent={settings.accent} /></div>
      <div className="text-slate-500">{word.trans[0]}</div>
      <input
        ref={inputRef} autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false}
        className="opacity-0 absolute h-0 w-0" value="" onChange={() => {}}
        onBeforeInput={(e) => {
          const data = (e.nativeEvent as InputEvent).data
          if (data) for (const ch of data) onKey(ch)
        }}
      />
    </div>
  )
}
