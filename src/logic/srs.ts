import type { WordCard } from '../types'
import { addDays } from './date'

const MIN_EASE = 1.3

export function newCard(dictId: string, word: string, today: string): WordCard {
  return { dictId, word, ease: 2.5, interval: 0, repetitions: 0, dueDate: today, wrongCount: 0, learned: false }
}

/** SM-2 精简版：根据本次答对/答错更新卡片。today 作为入参，便于测试。 */
export function review(card: WordCard, correct: boolean, today: string): WordCard {
  const next: WordCard = { ...card, learned: true }
  if (correct) {
    next.repetitions = card.repetitions + 1
    if (next.repetitions === 1) next.interval = 1
    else if (next.repetitions === 2) next.interval = 6
    else next.interval = Math.round(card.interval * card.ease)
  } else {
    next.repetitions = 0
    next.interval = 1
    next.ease = Math.max(MIN_EASE, card.ease - 0.2)
    next.wrongCount = card.wrongCount + 1
  }
  next.dueDate = addDays(today, next.interval)
  return next
}
