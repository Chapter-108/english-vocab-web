import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseLexicon, fetchWordDetails, _clearMemCache } from './lexicon'

const SAMPLE = [{
  word: 'abandon',
  phonetic: '/əˈbændən/',
  phonetics: [{ text: '' }, { text: '/əˈbændən/' }],
  meanings: [
    { partOfSpeech: 'verb',
      definitions: [
        { definition: 'to give up completely', example: 'they abandoned the car' },
        { definition: 'to desert someone' },
        { definition: 'third sense should be trimmed' },
      ],
      synonyms: ['desert', 'forsake', 'leave', 'quit', 'drop', 'sixth'] },
    { partOfSpeech: 'noun',
      definitions: [{ definition: 'complete lack of inhibition' }],
      synonyms: [] },
  ],
}]

describe('parseLexicon', () => {
  it('maps API json to WordDetails (max 2 senses/pos, 5 synonyms)', () => {
    const d = parseLexicon('abandon', SAMPLE)!
    expect(d.word).toBe('abandon')
    expect(d.phonetic).toBe('/əˈbændən/')
    expect(d.meanings).toHaveLength(3) // verb 2 + noun 1
    expect(d.meanings[0]).toEqual({
      partOfSpeech: 'verb', definition: 'to give up completely',
      example: 'they abandoned the car', synonyms: ['desert','forsake','leave','quit','drop'],
    })
    expect(d.meanings[1].example).toBeUndefined()
    expect(d.meanings[2].partOfSpeech).toBe('noun')
  })
  it('falls back to phonetics[].text when top-level phonetic missing', () => {
    const d = parseLexicon('x', [{ phonetics: [{ text: '' }, { text: '/eks/' }],
      meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'a letter' }], synonyms: [] }] }])!
    expect(d.phonetic).toBe('/eks/')
  })
  it('returns null on empty / non-array / no-meanings / dirty input', () => {
    expect(parseLexicon('x', [])).toBeNull()
    expect(parseLexicon('x', {})).toBeNull()
    expect(parseLexicon('x', [{ meanings: [] }])).toBeNull()
    expect(parseLexicon('x', 'nope')).toBeNull()
  })
})

describe('fetchWordDetails', () => {
  beforeEach(() => { localStorage.clear(); _clearMemCache() })
  it('fetches, parses, caches; second call does not refetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => SAMPLE })
    vi.stubGlobal('fetch', fetchMock)
    const d1 = await fetchWordDetails('Abandon') // 大小写归一
    expect(d1?.word).toBe('abandon')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const d2 = await fetchWordDetails('abandon')
    expect(fetchMock).toHaveBeenCalledTimes(1) // 命中内存缓存
    expect(d2).toBe(d1)
    vi.unstubAllGlobals()
  })
  it('returns null and does not throw when offline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const d = await fetchWordDetails('zzzznotcached')
    expect(d).toBeNull()
    vi.unstubAllGlobals()
  })
  it('reads from localStorage cache without fetching', async () => {
    localStorage.setItem('evw.lex.cachedword', JSON.stringify(
      { word: 'cachedword', meanings: [{ partOfSpeech: 'noun', definition: 'x', synonyms: [] }] }))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const d = await fetchWordDetails('cachedword')
    expect(d?.word).toBe('cachedword')
    expect(fetchMock).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
