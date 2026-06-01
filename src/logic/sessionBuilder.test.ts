
import { describe, it, expect } from 'vitest'
import { buildQueue, pickMode } from './sessionBuilder'
import { newCard } from './srs'
import type { Word, WordCard } from '../types'

const words: Word[] = ['a','b','c','d','e'].map(n => ({ name: n, trans: [n + '义'] }))
const TODAY = '2026-06-01'

describe('buildQueue', () => {
  it('returns due review words + new words up to remaining target', () => {
    const cards: WordCard[] = [
      { ...newCard('d1','a',TODAY), learned: true, dueDate: '2026-06-01' }, // due
      { ...newCard('d1','b',TODAY), learned: true, dueDate: '2026-06-05' }, // not due
    ]
    const q = buildQueue({ cards, words, dictId: 'd1', today: TODAY, dailyNewTarget: 2, newDoneToday: 0 })
    expect(q.review.map(w => w.name)).toEqual(['a'])
    // 新词从未学过的 c,d,e 里取 2 个
    expect(q.newWords).toHaveLength(2)
    expect(q.newWords.every(w => ['c','d','e'].includes(w.name))).toBe(true)
  })

  it('respects newDoneToday (remaining target)', () => {
    const q = buildQueue({ cards: [], words, dictId: 'd1', today: TODAY, dailyNewTarget: 3, newDoneToday: 2 })
    expect(q.newWords).toHaveLength(1) // 3 - 2
  })

  it('returns empty when nothing due and new target reached', () => {
    const q = buildQueue({ cards: [], words, dictId: 'd1', today: TODAY, dailyNewTarget: 0, newDoneToday: 0 })
    expect(q.review).toHaveLength(0)
    expect(q.newWords).toHaveLength(0)
  })
})

describe('pickMode', () => {
  it('new/undefined card -> choice', () => {
    expect(pickMode(undefined)).toBe('choice')
    expect(pickMode({ ...newCard('d','a',TODAY), repetitions: 0 })).toBe('choice')
  })
  it('reps 1-2 -> dictation', () => {
    expect(pickMode({ ...newCard('d','a',TODAY), repetitions: 1 })).toBe('dictation')
    expect(pickMode({ ...newCard('d','a',TODAY), repetitions: 2 })).toBe('dictation')
  })
  it('reps >=3 -> spelling', () => {
    expect(pickMode({ ...newCard('d','a',TODAY), repetitions: 3 })).toBe('spelling')
  })
})
