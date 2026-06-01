import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'

const EXPECTED: Record<string, number> = {
  'gaokao3500.json': 3877,
  'cet4.json': 2607,
  'cet6.json': 2345,
  'ielts.json': 3575,
  'toefl.json': 4264,
}

// 已知词 → 释义里必须出现的关键字（黄金抽查集，防张冠李戴）。已对照真实数据确认。
const GOLDEN: Record<string, Array<[string, string]>> = {
  'gaokao3500.json': [['cancel', '取消'], ['govern', '统治']],
  'cet4.json': [['abandon', '放弃'], ['ability', '能力']],
}

const CHECKSUMS: Record<string, string> =
  JSON.parse(readFileSync(resolve(process.cwd(), 'src/dicts.checksums.json'), 'utf-8').replace(/^﻿/, ''))

function raw(file: string): string {
  return readFileSync(resolve(process.cwd(), 'public/dicts', file), 'utf-8')
}
function load(file: string): any[] {
  return JSON.parse(raw(file))
}

describe('dictionary accuracy', () => {
  for (const [file, count] of Object.entries(EXPECTED)) {
    describe(file, () => {
      const text = raw(file)
      const data = load(file)

      it('content is locked by SHA-256 (no silent edits)', () => {
        const sha = createHash('sha256').update(text, 'utf8').digest('hex')
        expect(sha).toBe(CHECKSUMS[file])
      })

      it('is a non-empty array with exact expected count', () => {
        expect(Array.isArray(data)).toBe(true)
        expect(data.length).toBe(count)
      })

      it('every entry has a non-empty string name', () => {
        const bad = data.filter(w => typeof w.name !== 'string' || w.name.trim() === '')
        expect(bad).toEqual([])
      })

      it('every entry has a non-empty trans array of non-empty strings', () => {
        const bad = data.filter(w =>
          !Array.isArray(w.trans) || w.trans.length === 0 ||
          w.trans.some((t: any) => typeof t !== 'string' || t.trim() === ''))
        expect(bad.map(w => w.name)).toEqual([])
      })

      it('has no duplicate words', () => {
        const names = data.map(w => w.name)
        const dups = names.filter((n, i) => names.indexOf(n) !== i)
        expect([...new Set(dups)]).toEqual([])
      })

      it('has no encoding garbage (replacement char / HTML entities)', () => {
        expect(text.includes('�')).toBe(false)
        const entity = data.filter(w => /&[a-z]+;|&#\d+;/i.test(JSON.stringify(w.trans)))
        expect(entity.map(w => w.name)).toEqual([])
      })

      it('virtually every trans contains CJK (中文释义而非纯英文)', () => {
        const noCjk = data.filter(w => !/[一-鿿]/.test(w.trans.join('')))
        // 容忍极少数纯符号/缩写词条；超过 1% 视为异常
        expect(noCjk.length).toBeLessThan(Math.ceil(count * 0.01))
      })

      const golden = GOLDEN[file]
      if (golden) {
        it('golden words map to expected meanings', () => {
          for (const [word, key] of golden) {
            const entry = data.find(w => w.name === word)
            expect(entry, `missing word: ${word}`).toBeTruthy()
            expect(entry.trans.join(' ')).toContain(key)
          }
        })
      }
    })
  }
})
