import { describe, it, expect } from 'vitest'
import { newCard, review } from './srs'

const TODAY = '2026-06-01'

describe('newCard', () => {
  it('creates a due-today unlearned card with defaults', () => {
    const c = newCard('cet4', 'cancel', TODAY)
    expect(c).toMatchObject({
      dictId: 'cet4', word: 'cancel', ease: 2.5, interval: 0,
      repetitions: 0, dueDate: TODAY, wrongCount: 0, learned: false,
    })
  })
})

describe('review - correct answers', () => {
  it('first correct -> interval 1, due tomorrow, learned', () => {
    const c = review(newCard('cet4', 'cancel', TODAY), true, TODAY)
    expect(c.repetitions).toBe(1)
    expect(c.interval).toBe(1)
    expect(c.dueDate).toBe('2026-06-02')
    expect(c.learned).toBe(true)
    expect(c.ease).toBe(2.5)
  })
  it('second correct -> interval 6', () => {
    let c = review(newCard('cet4', 'cancel', TODAY), true, TODAY)       // interval 1
    c = review(c, true, '2026-06-02')                                   // interval 6
    expect(c.repetitions).toBe(2)
    expect(c.interval).toBe(6)
    expect(c.dueDate).toBe('2026-06-08')
  })
  it('third correct -> interval round(prev*ease)=round(6*2.5)=15', () => {
    let c = review(newCard('cet4', 'cancel', TODAY), true, TODAY)
    c = review(c, true, '2026-06-02')
    c = review(c, true, '2026-06-08')
    expect(c.repetitions).toBe(3)
    expect(c.interval).toBe(15)
    expect(c.dueDate).toBe('2026-06-23')
  })
})

describe('review - wrong answers', () => {
  it('wrong resets reps, interval=1, lowers ease, bumps wrongCount', () => {
    let c = review(newCard('cet4', 'cancel', TODAY), true, TODAY)       // ease 2.5
    c = review(c, false, '2026-06-02')
    expect(c.repetitions).toBe(0)
    expect(c.interval).toBe(1)
    expect(c.ease).toBeCloseTo(2.3)
    expect(c.wrongCount).toBe(1)
    expect(c.dueDate).toBe('2026-06-03')
    expect(c.learned).toBe(true)
  })
  it('ease never goes below 1.3', () => {
    let c = newCard('cet4', 'x', TODAY)
    for (let i = 0; i < 20; i++) c = review(c, false, TODAY)
    expect(c.ease).toBe(1.3)
  })
})
