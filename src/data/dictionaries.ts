import type { DictMeta } from '../types'

export const DICTIONARIES: DictMeta[] = [
  { id: 'gaokao3500', name: '高考 3500 词', description: '零基础入门，带中文释义', level: 'beginner',     file: 'gaokao3500.json', length: 3877 },
  { id: 'cet4',       name: 'CET-4',       description: '大学英语四级',           level: 'intermediate', file: 'cet4.json',       length: 2607 },
  { id: 'cet6',       name: 'CET-6',       description: '大学英语六级',           level: 'intermediate', file: 'cet6.json',       length: 2345 },
  { id: 'ielts',      name: 'IELTS',       description: '雅思核心词汇',           level: 'advanced',     file: 'ielts.json',      length: 3575 },
  { id: 'toefl',      name: 'TOEFL',       description: '托福核心词汇',           level: 'advanced',     file: 'toefl.json',      length: 4264 },
]

export function getDict(id: string): DictMeta | undefined {
  return DICTIONARIES.find(d => d.id === id)
}
