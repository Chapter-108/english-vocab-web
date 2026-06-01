import { describe, it, expect } from 'vitest'
import { buildChoices } from './quiz'
import type { Word } from '../types'

const pool: Word[] = [
  { name: 'cancel', trans: ['取消'] },
  { name: 'govern', trans: ['统治'] },
  { name: 'numerous', trans: ['众多的'] },
  { name: 'explosive', trans: ['爆炸的'] },
  { name: 'pretend', trans: ['假装'] },
]

describe('buildChoices', () => {
  const target = pool[0] // cancel / 取消
  // 确定性但「会推进」的随机桩：() => 0 那种退化值会让采样实现永远取到 target、
  // 取不到干扰项。用循环步进值即可同时满足整体洗牌版和随机采样版。
  const rng = (() => { let i = 0; const seq = [0.05, 0.25, 0.45, 0.65, 0.85]; return () => seq[i++ % seq.length] })()

  it('returns the requested number of options', () => {
    const r = buildChoices(target, pool, 4, rng)
    expect(r.options).toHaveLength(4)
  })
  it('includes the correct translation at correctIndex', () => {
    const r = buildChoices(target, pool, 4, rng)
    expect(r.options[r.correctIndex]).toBe('取消')
  })
  it('has no duplicate options', () => {
    const r = buildChoices(target, pool, 4, rng)
    expect(new Set(r.options).size).toBe(r.options.length)
  })
  it('degrades gracefully when pool is too small', () => {
    const r = buildChoices(target, pool.slice(0, 2), 4, rng) // 只有 cancel, govern
    expect(r.options.length).toBeLessThanOrEqual(2)
    expect(r.options[r.correctIndex]).toBe('取消')
  })
})
