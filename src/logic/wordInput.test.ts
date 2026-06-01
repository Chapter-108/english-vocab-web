import { describe, it, expect } from 'vitest'
import { initInput, inputChar } from './wordInput'

describe('inputChar (ignoreCase=true)', () => {
  it('accepts correct letters and reports progress', () => {
    let s = initInput('cat')           // typed=''
    s = inputChar(s, 'c'); expect(s.typed).toBe('c'); expect(s.error).toBe(false); expect(s.complete).toBe(false)
    s = inputChar(s, 'a'); expect(s.typed).toBe('ca')
    s = inputChar(s, 't'); expect(s.typed).toBe('cat'); expect(s.complete).toBe(true)
  })
  it('rejects a wrong letter and flags error without advancing', () => {
    let s = initInput('cat')
    s = inputChar(s, 'x')
    expect(s.typed).toBe('')
    expect(s.error).toBe(true)
    expect(s.complete).toBe(false)
  })
  it('is case-insensitive but keeps target casing', () => {
    let s = initInput('Cat')
    s = inputChar(s, 'c'); expect(s.typed).toBe('C')   // 保留目标大小写
  })
  it('auto-fills spaces so user only types letters', () => {
    let s = initInput('ice cream')
    s = inputChar(s, 'i'); s = inputChar(s, 'c'); s = inputChar(s, 'e')
    expect(s.typed).toBe('ice ')                       // 空格被自动补上
    s = inputChar(s, 'c')
    expect(s.typed).toBe('ice c')
  })
})

describe('inputChar (ignoreCase=false)', () => {
  it('treats wrong case as error', () => {
    let s = initInput('Cat', false)
    s = inputChar(s, 'c')
    expect(s.error).toBe(true)
    expect(s.typed).toBe('')
  })
})
