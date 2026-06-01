import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Word, Settings, StudyMode, WordCard } from '../types'
import { store } from '../services/storage'
import { loadDict } from '../services/dictionaryLoader'
import { getDict } from '../data/dictionaries'
import { buildQueue, pickMode } from '../logic/sessionBuilder'
import { newCard, review } from '../logic/srs'
import { today } from '../logic/date'

export interface SessionItem { word: Word; mode: StudyMode; isNew: boolean }

export function useStudySession(dictId: string, settings: Settings) {
  const [words, setWords] = useState<Word[]>([])
  const [queue, setQueue] = useState<SessionItem[]>([])
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
    const meta = getDict(dictId)
    if (!meta) { setLoading(false); return }
    loadDict(meta.file).then(ws => {
      setWords(ws)
      const cards = store.loadCards()
      cardsRef.current = cards
      const daily = store.loadDaily().find(d => d.date === t)
      const newDoneToday = daily?.newWords ?? 0
      const q = buildQueue({ cards, words: ws, dictId, today: t, dailyNewTarget: settings.dailyNewTarget, newDoneToday })
      const cardByWord = new Map(cards.map(c => [c.word, c]))
      const items: SessionItem[] = [
        ...q.review.map(w => ({ word: w, mode: pickMode(cardByWord.get(w.name)), isNew: false })),
        ...q.newWords.map(w => ({ word: w, mode: 'choice' as StudyMode, isNew: true })),
      ].map(it => settings.forcedMode === 'auto' ? it : { ...it, mode: settings.forcedMode })
      setQueue(items)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [dictId]) // eslint-disable-line react-hooks/exhaustive-deps

  const current = queue[index]

  const submit = useCallback((correct: boolean) => {
    if (!current) return
    const cards = cardsRef.current
    const idx = cards.findIndex(c => c.dictId === dictId && c.word === current.word.name)
    const base = idx >= 0 ? cards[idx] : newCard(dictId, current.word.name, t)
    const updated = review(base, correct, t)
    if (idx >= 0) cards[idx] = updated; else cards.push(updated)
    flushCards()

    const remainingNew = queue.slice(index + 1).filter(i => i.isNew).length
    const newTargetReached = (store.loadDaily().find(d => d.date === t)?.newWords ?? 0) + (current.isNew ? 1 : 0) >= settings.dailyNewTarget
    store.recordStudy(t, { isNew: current.isNew, goalReached: newTargetReached && remainingNew === 0 })

    setReviewing({ word: current.word, correct })
  }, [current, dictId, index, queue, settings.dailyNewTarget, t, flushCards])

  const next = useCallback(() => {
    setReviewing(null)
    setIndex(i => i + 1)
  }, [])

  useEffect(() => () => {
    if (writeTimer.current) { clearTimeout(writeTimer.current); store.saveCards(cardsRef.current) }
  }, [])

  const done = !loading && index >= queue.length
  const pool = useMemo(() => words, [words])

  return { loading, current, reviewing, done, pool, progress: { index, total: queue.length }, submit, next }
}
