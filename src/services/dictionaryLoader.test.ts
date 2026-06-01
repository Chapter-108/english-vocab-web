import { describe, it, expect, vi } from 'vitest'
import { parseDict, loadDict } from './dictionaryLoader'

describe('parseDict', () => {
  it('keeps valid entries', () => {
    const data = [{ name: 'cat', trans: ['猫'], usphone: 'kæt' }]
    expect(parseDict(data)).toEqual([{ name: 'cat', trans: ['猫'], usphone: 'kæt', ukphone: undefined }])
  })
  it('drops entries with empty name or trans', () => {
    const data = [{ name: '', trans: ['x'] }, { name: 'ok', trans: [] }, { name: 'cat', trans: ['猫'] }]
    expect(parseDict(data).map(w => w.name)).toEqual(['cat'])
  })
  it('throws on non-array input', () => {
    expect(() => parseDict({} as any)).toThrow()
  })
})

describe('loadDict', () => {
  it('fetches and parses by filename', async () => {
    const json = [{ name: 'cat', trans: ['猫'] }]
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => json } as any)
    vi.stubGlobal('fetch', fetchMock)
    const words = await loadDict('cet4.json')
    expect(fetchMock).toHaveBeenCalledWith('dicts/cet4.json')
    expect(words[0].name).toBe('cat')
    vi.unstubAllGlobals()
  })
  it('throws when response not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 } as any))
    await expect(loadDict('missing.json')).rejects.toThrow()
    vi.unstubAllGlobals()
  })
})
