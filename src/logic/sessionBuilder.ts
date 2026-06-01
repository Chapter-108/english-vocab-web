import type { Word, WordCard, StudyMode } from '../types'
import { isDue } from './date'

export interface QueueInput {
  cards: WordCard[]
  words: Word[]
  dictId: string
  today: string
  dailyNewTarget: number
  newDoneToday: number
}
export interface Queue { review: Word[]; newWords: Word[] }

export function buildQueue(input: QueueInput): Queue {
  const { cards, words, dictId, today, dailyNewTarget, newDoneToday } = input
  const cardByWord = new Map(cards.filter(c => c.dictId === dictId).map(c => [c.word, c]))

  const review = words.filter(w => {
    const c = cardByWord.get(w.name)
    return c && c.learned && isDue(c.dueDate, today)
  })

  const remaining = Math.max(0, dailyNewTarget - newDoneToday)
  const newWords = words.filter(w => !cardByWord.has(w.name)).slice(0, remaining)

  return { review, newWords }
}

export function pickMode(card: WordCard | undefined): StudyMode {
  if (!card || card.repetitions === 0) return 'choice'
  if (card.repetitions <= 2) return 'dictation'
  return 'spelling'
}
