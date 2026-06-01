export interface WordSense { partOfSpeech: string; definition: string; example?: string; synonyms: string[] }
export interface WordDetails { word: string; phonetic?: string; meanings: WordSense[] }

const MAX_SENSES_PER_POS = 2
const MAX_SYNONYMS = 5

/** 把 dictionaryapi.dev 的返回解析成 WordDetails；脏/空输入或无释义返回 null。 */
export function parseLexicon(word: string, data: unknown): WordDetails | null {
  if (!Array.isArray(data) || data.length === 0) return null
  const entry = data[0] as any
  if (!entry || typeof entry !== 'object') return null

  let phonetic: string | undefined =
    typeof entry.phonetic === 'string' && entry.phonetic.trim() ? entry.phonetic : undefined
  if (!phonetic && Array.isArray(entry.phonetics)) {
    const p = entry.phonetics.find((x: any) => x && typeof x.text === 'string' && x.text.trim())
    if (p) phonetic = p.text
  }

  const meanings: WordSense[] = []
  const raw = Array.isArray(entry.meanings) ? entry.meanings : []
  for (const m of raw) {
    if (!m || typeof m.partOfSpeech !== 'string' || !Array.isArray(m.definitions)) continue
    const defs = m.definitions.filter((d: any) => d && typeof d.definition === 'string' && d.definition.trim())
    const synonyms = Array.isArray(m.synonyms)
      ? m.synonyms.filter((s: any) => typeof s === 'string').slice(0, MAX_SYNONYMS) : []
    for (const d of defs.slice(0, MAX_SENSES_PER_POS)) {
      meanings.push({
        partOfSpeech: m.partOfSpeech,
        definition: d.definition,
        example: typeof d.example === 'string' && d.example.trim() ? d.example : undefined,
        synonyms: [...synonyms],
      })
    }
  }
  if (meanings.length === 0) return null
  return { word, phonetic, meanings }
}

const memCache = new Map<string, WordDetails | null>()
const LS_PREFIX = 'evw.lex.'

function readLS(key: string): WordDetails | null | undefined {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key)
    if (raw == null) return undefined
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.word !== 'string' || !Array.isArray(parsed.meanings)) return undefined
    return parsed as WordDetails
  } catch { return undefined }
}

/** 拉取词的用法详情：内存 + localStorage 双缓存；离线/失败/404 返回缓存或 null（不抛）。 */
export async function fetchWordDetails(word: string): Promise<WordDetails | null> {
  const key = word.toLowerCase()
  if (memCache.has(key)) return memCache.get(key) as WordDetails | null
  const cached = readLS(key)
  if (cached !== undefined) { memCache.set(key, cached); return cached }
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`)
    if (!res.ok) { memCache.set(key, null); return null }
    const details = parseLexicon(key, await res.json())
    memCache.set(key, details)
    if (details) { try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(details)) } catch { /* 配额满忽略 */ } }
    return details
  } catch {
    return null // 离线/网络错误：无缓存则 null
  }
}

/** 仅供测试：清空进程内缓存，保证用例隔离。 */
export function _clearMemCache() { memCache.clear() }
