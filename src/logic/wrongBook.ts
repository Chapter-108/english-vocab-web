import type { WordCard } from '../types'

/** 错词本成员：答错过且尚未答对（repetitions 归 0）。答对 1 次后 repetitions 变 1，自动移出。 */
export function selectWrongWords(cards: WordCard[]): WordCard[] {
  return cards.filter(c => c.wrongCount > 0 && c.repetitions === 0)
}
