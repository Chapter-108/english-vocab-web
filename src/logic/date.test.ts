import { describe, it, expect } from 'vitest'
import { addDays, isDue } from './date'

describe('addDays', () => {
  it('adds days within a month', () => {
    expect(addDays('2026-06-01', 5)).toBe('2026-06-06')
  })
  it('rolls over month boundary', () => {
    expect(addDays('2026-06-29', 5)).toBe('2026-07-04')
  })
  it('adding 0 returns same date', () => {
    expect(addDays('2026-06-01', 0)).toBe('2026-06-01')
  })
})

describe('isDue', () => {
  it('due when dueDate <= today', () => {
    expect(isDue('2026-06-01', '2026-06-01')).toBe(true)
    expect(isDue('2026-05-31', '2026-06-01')).toBe(true)
  })
  it('not due when dueDate is in the future', () => {
    expect(isDue('2026-06-02', '2026-06-01')).toBe(false)
  })
})
