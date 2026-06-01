import type { Word } from '../types'

export interface Choices { options: string[]; correctIndex: number }

/** 为目标词生成「1 正确 + (count-1) 干扰」的中文选项；rng 注入便于测试。
 *  随机采样 count-1 个不重复干扰项，避免对超大词库做整体洗牌（流畅性）。 */
export function buildChoices(target: Word, pool: Word[], count = 4, rng: () => number = Math.random): Choices {
  const correct = target.trans[0]
  const seen = new Set<string>([correct])
  const distractors: string[] = []
  const maxTries = (count - 1) * 30
  let tries = 0
  while (distractors.length < count - 1 && tries < maxTries && pool.length > 1) {
    tries++
    const w = pool[Math.floor(rng() * pool.length)]
    if (w.name === target.name) continue
    const t = w.trans[0]
    if (!seen.has(t)) { seen.add(t); distractors.push(t) }
  }
  const options = shuffle([correct, ...distractors], rng)
  return { options, correctIndex: options.indexOf(correct) }
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
