import type { Word } from '../types'

export function parseDict(data: unknown): Word[] {
  if (!Array.isArray(data)) throw new Error('dictionary is not an array')
  return data
    .filter((w: any) => typeof w?.name === 'string' && w.name.trim() !== '' && Array.isArray(w.trans) && w.trans.length > 0)
    .map((w: any) => ({ name: w.name, trans: w.trans, usphone: w.usphone, ukphone: w.ukphone }))
}

const cache = new Map<string, Word[]>()

export async function loadDict(file: string): Promise<Word[]> {
  if (cache.has(file)) return cache.get(file)!
  const res = await fetch(`dicts/${file}`)
  if (!res.ok) throw new Error(`failed to load ${file}: ${res.status}`)
  const words = parseDict(await res.json())
  cache.set(file, words)
  return words
}
