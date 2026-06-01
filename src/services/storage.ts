import type { WordCard, DailyRecord, Settings } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import { addDays } from '../logic/date'

const K_CARDS = 'evw.cards'
const K_DAILY = 'evw.daily'
const K_SETTINGS = 'evw.settings'

export function createStore(backend: Storage = localStorage) {
  function read<T>(key: string, fallback: T): T {
    const raw = backend.getItem(key)
    if (!raw) return fallback
    try { return JSON.parse(raw) as T } catch { return fallback }
  }
  function write<T>(key: string, val: T) { backend.setItem(key, JSON.stringify(val)) }

  return {
    loadCards: () => read<WordCard[]>(K_CARDS, []),
    saveCards: (cards: WordCard[]) => write(K_CARDS, cards),

    loadSettings: () => ({ ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(K_SETTINGS, {}) }),
    saveSettings: (s: Settings) => write(K_SETTINGS, s),

    loadDaily: () => read<DailyRecord[]>(K_DAILY, []),

    recordStudy(date: string, opts: { isNew: boolean; goalReached: boolean }) {
      const daily = read<DailyRecord[]>(K_DAILY, [])
      let rec = daily.find(d => d.date === date)
      if (!rec) { rec = { date, newWords: 0, reviewWords: 0, goalReached: false }; daily.push(rec) }
      if (opts.isNew) rec.newWords += 1; else rec.reviewWords += 1
      if (opts.goalReached) rec.goalReached = true
      write(K_DAILY, daily)
    },

    /** 从 today 往回连续 goalReached 的天数。 */
    streak(today: string): number {
      const daily = read<DailyRecord[]>(K_DAILY, [])
      const byDate = new Map(daily.map(d => [d.date, d]))
      let count = 0
      let cursor = today
      while (true) {
        const rec = byDate.get(cursor)
        if (rec && rec.goalReached) { count++; cursor = addDays(cursor, -1) }
        else break
      }
      return count
    },
  }
}

export const store = createStore()
