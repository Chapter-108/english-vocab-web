import { useMemo, useState } from 'react'
import type { Word, Settings } from '../types'
import { buildChoices } from '../logic/quiz'
import { WordAudio } from './WordAudio'

export function ChoiceMode({ word, pool, settings, onResult }: {
  word: Word; pool: Word[]; settings: Settings; onResult: (correct: boolean) => void
}) {
  const { options, correctIndex } = useMemo(() => buildChoices(word, pool, 4), [word, pool])
  const [picked, setPicked] = useState<number | null>(null)

  function choose(i: number) {
    if (picked !== null) return
    setPicked(i)
    setTimeout(() => onResult(i === correctIndex), 800)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-3xl font-bold">{word.name}</div>
      <div className="text-slate-500 flex items-center gap-2">{word.usphone && `/${word.usphone}/`} <WordAudio word={word.name} accent={settings.accent} /></div>
      <div className="w-full max-w-sm flex flex-col gap-3 mt-4">
        {options.map((opt, i) => {
          let cls = 'border-slate-200 bg-white'
          if (picked !== null) {
            if (i === correctIndex) cls = 'border-green-500 bg-green-50'
            else if (i === picked) cls = 'border-red-500 bg-red-50'
          }
          return (
            <button key={i} onClick={() => choose(i)} className={`border-2 rounded-xl px-4 py-3 text-left transition-colors duration-200 active:scale-[0.99] ${cls}`}>
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}
