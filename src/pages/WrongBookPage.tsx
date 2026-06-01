import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { store } from '../services/storage'
import { selectWrongWords } from '../logic/wrongBook'
import { getDict } from '../data/dictionaries'
import { loadDict } from '../services/dictionaryLoader'
import type { Word } from '../types'

interface Row { word: string; dictName: string; trans: string; wrongCount: number }

export function WrongBookPage() {
  const [rows, setRows] = useState<Row[] | null>(null)

  useEffect(() => {
    const cards = selectWrongWords(store.loadCards())
    const dictIds = [...new Set(cards.map(c => c.dictId))]
    Promise.all(dictIds.map(id => {
      const meta = getDict(id)
      return meta ? loadDict(meta.file).then(ws => [id, ws] as const) : Promise.resolve([id, [] as Word[]] as const)
    })).then(pairs => {
      const byDict = new Map<string, Word[]>(pairs)
      const rs: Row[] = cards.map(c => {
        const w = (byDict.get(c.dictId) ?? []).find(x => x.name === c.word)
        return { word: c.word, dictName: getDict(c.dictId)?.name ?? c.dictId, trans: w?.trans[0] ?? '', wrongCount: c.wrongCount }
      })
      setRows(rs)
    }).catch(() => setRows([]))
  }, [])

  if (rows === null) return <div className="p-8 text-center text-slate-400">加载中…</div>
  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold mb-4">错词本</h1>
      {rows.length === 0 ? (
        <div className="text-center text-slate-400 mt-12">还没有错词 🎉</div>
      ) : (
        <>
          <Link to="/review-wrong" className="block text-center bg-blue-600 text-white rounded-full px-6 py-3 mb-4 transition-transform active:scale-95">
            重练错词（{rows.length}）
          </Link>
          {rows.map((r) => (
            <div key={`${r.dictName}-${r.word}`} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
              <div className="flex justify-between items-baseline">
                <span className="font-semibold text-lg">{r.word}</span>
                <span className="text-xs text-red-400">错 {r.wrongCount} 次</span>
              </div>
              <div className="text-sm text-slate-500">{r.trans}</div>
              <div className="text-xs text-slate-300 mt-1">{r.dictName}</div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
