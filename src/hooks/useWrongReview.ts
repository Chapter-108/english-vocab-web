import { useCallback, useEffect, useRef, useState } from 'react'
import type { Word, Settings, StudyMode, WordCard } from '../types'
import { store } from '../services/storage'
import { loadDict } from '../services/dictionaryLoader'
import { getDict } from '../data/dictionaries'
import { pickMode } from '../logic/sessionBuilder'
import { selectWrongWords } from '../logic/wrongBook'
import { newCard, review } from '../logic/srs'
import { today } from '../logic/date'

export interface WrongItem { word: Word; dictId: string; pool: Word[]; mode: StudyMode }

export function useWrongReview(settings: Settings) {
  const [items, setItems] = useState<WrongItem[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState<{ word: Word; correct: boolean } | null>(null)
  const t = today()

  const cardsRef = useRef<WordCard[]>([])
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flushCards = useCallback(() => {
    if (writeTimer.current) clearTimeout(writeTimer.current)
    writeTimer.current = setTimeout(() => store.saveCards(cardsRef.current), 300)
  }, [])

  useEffect(() => {
    const cards = store.loadCards()
    cardsRef.current = cards
    const wrong = selectWrongWords(cards)
    const dictIds = [...new Set(wrong.map(c => c.dictId))]
    Promise.all(dictIds.map(id => {
      const meta = getDict(id)
      return meta ? loadDict(meta.file).then(ws => [id, ws] as const) : Promise.resolve([id, [] as Word[]] as const)
    })).then(pairs => {
      const byDict = new Map<string, Word[]>(pairs)
      const its: WrongItem[] = []
      for (const c of wrong) {
        const ws = byDict.get(c.dictId) ?? []
        const word = ws.find(x => x.name === c.word)
        if (!word) continue
        const mode: StudyMode = settings.forcedMode === 'auto' ? pickMode(c) : settings.forcedMode
        its.push({ word, dictId: c.dictId, pool: ws, mode })
      }
      setItems(its); setLoading(false)
    }).catch(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const current = items[index]

  const submit = useCallback((correct: boolean) => {
    if (!current) return
    const cards = cardsRef.current
    const idx = cards.findIndex(c => c.dictId === current.dictId && c.word === current.word.name)
    const base = idx >= 0 ? cards[idx] : newCard(current.dictId, current.word.name, t)
    const updated = review(base, correct, t)
    if (idx >= 0) cards[idx] = updated; else cards.push(updated)
    flushCards()
    store.recordStudy(t, { isNew: false, goalReached: false })
    setReviewing({ word: current.word, correct })
  }, [current, t, flushCards])

  const next = useCallback(() => { setReviewing(null); setIndex(i => i + 1) }, [])

  useEffect(() => () => {
    if (writeTimer.current) { clearTimeout(writeTimer.current); store.saveCards(cardsRef.current) }
  }, [])

  const done = !loading && index >= items.length
  return { loading, current, reviewing, done, progress: { index, total: items.length }, submit, next }
}
