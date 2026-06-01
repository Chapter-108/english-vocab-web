export interface Word {
  name: string
  trans: string[]
  usphone?: string
  ukphone?: string
}

export type Level = 'beginner' | 'intermediate' | 'advanced'

export interface DictMeta {
  id: string
  name: string
  description: string
  level: Level
  file: string
  length: number
}

export interface WordCard {
  dictId: string
  word: string
  ease: number
  interval: number
  repetitions: number
  dueDate: string   // YYYY-MM-DD
  wrongCount: number
  learned: boolean
}

export interface DailyRecord {
  date: string      // YYYY-MM-DD
  newWords: number
  reviewWords: number
  goalReached: boolean
}

export type StudyMode = 'choice' | 'dictation' | 'spelling'

export interface Settings {
  dailyNewTarget: number
  accent: 'us' | 'uk'
  soundOn: boolean
  forcedMode: 'auto' | StudyMode
  ignoreCase: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  dailyNewTarget: 15,
  accent: 'us',
  soundOn: true,
  forcedMode: 'auto',
  ignoreCase: true,
}
