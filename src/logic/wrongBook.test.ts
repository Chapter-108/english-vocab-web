import { describe, it, expect } from 'vitest'
import { selectWrongWords } from './wrongBook'
import type { WordCard } from '../types'

const card = (over: Partial<WordCard>): WordCard => ({
  dictId: 'd', word: 'w', ease: 2.5, interval: 1, repetitions: 0,
  dueDate: '2026-06-01', wrongCount: 0, learned: true, ...over,
})

describe('selectWrongWords', () => {
  it('includes only wrongCount>0 and repetitions===0', () => {
    const cards = [
      card({ word: 'a', wrongCount: 1, repetitions: 0 }), // 在本
      card({ word: 'b', wrongCount: 0, repetitions: 0 }), // 没错过
      card({ word: 'c', wrongCount: 2, repetitions: 1 }), // 错过但已答对1次→出本
    ]
    expect(selectWrongWords(cards).map(c => c.word)).toEqual(['a'])
  })
  it('a word answered correctly once leaves the book', () => {
    expect(selectWrongWords([card({ wrongCount: 3, repetitions: 1 })])).toEqual([])
  })
  it('spans dicts', () => {
    const cards = [
      card({ dictId: 'd1', word: 'a', wrongCount: 1, repetitions: 0 }),
      card({ dictId: 'd2', word: 'b', wrongCount: 3, repetitions: 0 }),
    ]
    expect(selectWrongWords(cards).length).toBe(2)
  })
})
