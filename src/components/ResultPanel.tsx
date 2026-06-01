import { useEffect, useState } from 'react'
import type { Word, Settings } from '../types'
import { speak } from '../services/speech'
import { fetchWordDetails, type WordDetails } from '../services/lexicon'

export function ResultPanel({ word, correct, accent, onNext }: {
  word: Word; correct: boolean; accent: Settings['accent']; onNext: () => void
}) {
  const [status, setStatus] = useState<'loading' | 'data' | 'none'>('loading')
  const [details, setDetails] = useState<WordDetails | null>(null)

  useEffect(() => {
    let alive = true
    setStatus('loading'); setDetails(null)
    fetchWordDetails(word.name).then(d => {
      if (!alive) return
      if (d) { setDetails(d); setStatus('data') } else setStatus('none')
    })
    return () => { alive = false }
  }, [word])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') { e.preventDefault(); onNext() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onNext])

  return (
    <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
      <div className={`text-lg font-semibold ${correct ? 'text-green-600' : 'text-red-500'}`}>
        {correct ? '✓ 答对' : '✗ 答错'}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-3xl font-bold">{word.name}</span>
        <button onClick={() => speak(word.name, accent)} className="text-2xl transition-transform active:scale-90" aria-label="play pronunciation">🔊</button>
      </div>
      <div className="text-slate-500 text-sm">
        {word.usphone && <span>美 /{word.usphone}/　</span>}
        {word.ukphone && <span>英 /{word.ukphone}/</span>}
      </div>

      <div className="w-full bg-white rounded-xl p-4 shadow-sm">
        <div className="text-slate-400 text-xs mb-1">释义</div>
        <ul className="list-disc pl-5 space-y-1">
          {word.trans.map((t, i) => <li key={i} className="text-slate-800">{t}</li>)}
        </ul>
      </div>

      <div className="w-full bg-white rounded-xl p-4 shadow-sm">
        <div className="text-slate-400 text-xs mb-1">例句 / 用法</div>
        {status === 'loading' && <div className="text-slate-400 text-sm">加载用法中…</div>}
        {status === 'none' && <div className="text-slate-400 text-sm">暂无更多用法（离线或未收录）</div>}
        {status === 'data' && details && (
          <div className="space-y-2">
            {details.meanings.map((m, i) => (
              <div key={i}>
                <span className="text-blue-600 text-sm">{m.partOfSpeech}</span>{' '}
                <span className="text-slate-700 text-sm">{m.definition}</span>
                {m.example && <div className="text-slate-400 text-sm italic">"{m.example}"</div>}
                {m.synonyms.length > 0 && <div className="text-slate-400 text-xs">近义: {m.synonyms.join(', ')}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={onNext} className="bg-blue-600 text-white rounded-full px-10 py-3 text-lg transition-transform active:scale-95">
        下一个 →
      </button>
      <div className="text-slate-300 text-xs">回车 / 空格 继续</div>
    </div>
  )
}
