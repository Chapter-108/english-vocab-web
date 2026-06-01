import { describe, it, expect, beforeEach } from 'vitest'
import { createStore } from './storage'
import { DEFAULT_SETTINGS } from '../types'
import type { WordCard } from '../types'

// 内存版 Storage
function memStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() { return m.size },
    clear: () => m.clear(),
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  }
}

describe('storage', () => {
  let store: ReturnType<typeof createStore>
  beforeEach(() => { store = createStore(memStorage()) })

  it('round-trips cards', () => {
    const cards: WordCard[] = [{ dictId: 'd', word: 'a', ease: 2.5, interval: 1, repetitions: 1, dueDate: '2026-06-02', wrongCount: 0, learned: true }]
    store.saveCards(cards)
    expect(store.loadCards()).toEqual(cards)
  })

  it('returns defaults when empty', () => {
    expect(store.loadCards()).toEqual([])
    expect(store.loadSettings()).toEqual(DEFAULT_SETTINGS)
    expect(store.loadDaily()).toEqual([])
  })

  it('records study and computes streak', () => {
    store.recordStudy('2026-05-30', { isNew: true, goalReached: true })
    store.recordStudy('2026-05-31', { isNew: true, goalReached: true })
    store.recordStudy('2026-06-01', { isNew: true, goalReached: true })
    expect(store.streak('2026-06-01')).toBe(3)
  })

  it('streak breaks on a missing/un-reached day', () => {
    store.recordStudy('2026-05-30', { isNew: true, goalReached: true })
    // 2026-05-31 缺失
    store.recordStudy('2026-06-01', { isNew: true, goalReached: true })
    expect(store.streak('2026-06-01')).toBe(1)
  })

  it('aggregates same-day records', () => {
    store.recordStudy('2026-06-01', { isNew: true, goalReached: false })
    store.recordStudy('2026-06-01', { isNew: false, goalReached: true })
    const daily = store.loadDaily().find(d => d.date === '2026-06-01')!
    expect(daily.newWords).toBe(1)
    expect(daily.reviewWords).toBe(1)
    expect(daily.goalReached).toBe(true)
  })
})
