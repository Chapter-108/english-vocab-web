# 答题停留 + 释义/用法面板 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) 三种学习模式答完后不自动切词，改为弹出「结果面板」展示完整释义 + 音标 + 在线例句/用法，用户手动点「下一个」继续；(2) 新增「错词本」标签：列出错词，可一键重练，答对 1 次自动移出。

**Architecture:** 新增可单测的在线词典服务 `lexicon.ts`（解析 + 双缓存，离线降级）与纯函数 `wrongBook.ts`（错词派生）；新增展示组件 `ResultPanel.tsx`；`useStudySession` 把"判分"与"切词"拆开（新增 `reviewing` 态 + `next()`）；错词本用 `useWrongReview` hook 复用同一「判分→面板→下一个」流程。错词本成员**派生自 `wrongCount>0 && repetitions===0`，不改 srs / WordCard**。

**Tech Stack:** React 19 + TS（现有项目）、Vitest、dictionaryapi.dev（免费英英词典 API）。

**前置：** 工作目录 `d:\桌面\项目汇总\英语学习\english-vocab-web`，PowerShell，每个任务完成即 `git`。规格见 `docs/superpowers/specs/2026-06-01-review-panel-design.md`。

---

## 文件结构

```
src/services/lexicon.ts          ← 新：parseLexicon(纯) + fetchWordDetails(缓存/降级)
src/services/lexicon.test.ts     ← 新：单测
src/components/ResultPanel.tsx   ← 新：结果面板
src/hooks/useStudySession.ts     ← 改：拆分 submit/next + reviewing 态
src/pages/StudySessionPage.tsx   ← 改：reviewing 时渲染面板
src/components/ChoiceMode.tsx    ← 改：去掉 setPicked(null)，0.8s 后只上报结果
src/logic/wrongBook.ts           ← 新：selectWrongWords(纯)
src/logic/wrongBook.test.ts      ← 新：单测
src/pages/WrongBookPage.tsx      ← 新：错词列表 + 「重练错词」
src/hooks/useWrongReview.ts      ← 新：错词重练 session（复用判分/面板/切词）
src/pages/WrongReviewPage.tsx    ← 新：错词重练页
src/components/TabBar.tsx        ← 改：加「错词」标签
src/pages/StatsPage.tsx          ← 改：错词数口径对齐 selectWrongWords
src/App.tsx                      ← 改：加 /wrong、/review-wrong 路由
```

---

## Task 1: 在线词典服务 lexicon（TDD）

**Files:**
- Create: `src/services/lexicon.ts`
- Test: `src/services/lexicon.test.ts`

- [ ] **Step 1: 写失败测试**

`src/services/lexicon.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseLexicon, fetchWordDetails } from './lexicon'

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
  beforeEach(() => { localStorage.clear() })
  it('fetches, parses, caches; second call does not refetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => SAMPLE })
    vi.stubGlobal('fetch', fetchMock)
    const d1 = await fetchWordDetails('Abandon') // 大小写归一
    expect(d1?.word).toBe('abandon')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const d2 = await fetchWordDetails('abandon')
    expect(fetchMock).toHaveBeenCalledTimes(1) // 命中内存缓存
    expect(d2).toEqual(d1)
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
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- lexicon`
Expected: FAIL（找不到 `./lexicon`）。

- [ ] **Step 3: 实现**

`src/services/lexicon.ts`:
```ts
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
        synonyms,
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
    return raw == null ? undefined : (JSON.parse(raw) as WordDetails)
  } catch { return undefined }
}

/** 拉取词的用法详情：内存 + localStorage 双缓存；离线/失败/404 返回缓存或 null（不抛）。 */
export async function fetchWordDetails(word: string): Promise<WordDetails | null> {
  const key = word.toLowerCase()
  if (memCache.has(key)) return memCache.get(key)!
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
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- lexicon`
Expected: PASS。

- [ ] **Step 5: 提交**

```
git add src/services/lexicon.ts src/services/lexicon.test.ts
git commit -m "feat: online lexicon service (parse + cached fetch, offline-safe)"
```

---

## Task 2: 结果面板组件 ResultPanel

**Files:**
- Create: `src/components/ResultPanel.tsx`

> 靠类型检查 + 后续 e2e/手动验证。

- [ ] **Step 1: 实现**

`src/components/ResultPanel.tsx`:
```tsx
import { useEffect, useState } from 'react'
import type { Word, Settings } from '../types'
import { speak } from '../services/speech'
import { fetchWordDetails, type WordDetails } from '../services/lexicon'

export function ResultPanel({ word, correct, accent, onNext }: {
  word: Word; correct: boolean; accent: Settings['accent']; onNext: () => void
}) {
  const [status, setStatus] = useState<'loading' | 'data' | 'none'>('loading')
  const [details, setDetails] = useState<WordDetails | null>(null)

  useEffect(() => {
    let alive = true
    setStatus('loading'); setDetails(null)
    fetchWordDetails(word.name).then(d => {
      if (!alive) return
      if (d) { setDetails(d); setStatus('data') } else setStatus('none')
    })
    return () => { alive = false }
  }, [word])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') { e.preventDefault(); onNext() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onNext])

  return (
    <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
      <div className={`text-lg font-semibold ${correct ? 'text-green-600' : 'text-red-500'}`}>
        {correct ? '✓ 答对' : '✗ 答错'}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-3xl font-bold">{word.name}</span>
        <button onClick={() => speak(word.name, accent)} className="text-2xl transition-transform active:scale-90" aria-label="play pronunciation">🔊</button>
      </div>
      <div className="text-slate-500 text-sm">
        {word.usphone && <span>美 /{word.usphone}/　</span>}
        {word.ukphone && <span>英 /{word.ukphone}/</span>}
      </div>

      <div className="w-full bg-white rounded-xl p-4 shadow-sm">
        <div className="text-slate-400 text-xs mb-1">释义</div>
        <ul className="list-disc pl-5 space-y-1">
          {word.trans.map((t, i) => <li key={i} className="text-slate-800">{t}</li>)}
        </ul>
      </div>

      <div className="w-full bg-white rounded-xl p-4 shadow-sm">
        <div className="text-slate-400 text-xs mb-1">例句 / 用法</div>
        {status === 'loading' && <div className="text-slate-400 text-sm">加载用法中…</div>}
        {status === 'none' && <div className="text-slate-400 text-sm">暂无更多用法（离线或未收录）</div>}
        {status === 'data' && details && (
          <div className="space-y-2">
            {details.meanings.map((m, i) => (
              <div key={i}>
                <span className="text-blue-600 text-sm">{m.partOfSpeech}</span>{' '}
                <span className="text-slate-700 text-sm">{m.definition}</span>
                {m.example && <div className="text-slate-400 text-sm italic">“{m.example}”</div>}
                {m.synonyms.length > 0 && <div className="text-slate-400 text-xs">近义: {m.synonyms.join(', ')}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={onNext} className="bg-blue-600 text-white rounded-full px-10 py-3 text-lg transition-transform active:scale-95">
        下一个 →
      </button>
      <div className="text-slate-300 text-xs">回车 / 空格 继续</div>
    </div>
  )
}
```

- [ ] **Step 2: 类型检查 + 提交**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: 无错误。
```
git add src/components/ResultPanel.tsx
git commit -m "feat: ResultPanel (correctness + full meanings + online usage)"
```

---

## Task 3: 接线 —— hook 拆分 + 页面渲染面板 + 认词微调

**Files:**
- Modify: `src/hooks/useStudySession.ts`（加 `reviewing` 态与 `next()`，`submit` 不再切词）
- Modify: `src/pages/StudySessionPage.tsx`（`reviewing` 时渲染 `ResultPanel`）
- Modify: `src/components/ChoiceMode.tsx`（0.8s 后只上报结果）

- [ ] **Step 1: 改 hook —— 用下面整段替换 `src/hooks/useStudySession.ts`**

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Word, Settings, StudyMode, WordCard } from '../types'
import { store } from '../services/storage'
import { loadDict } from '../services/dictionaryLoader'
import { getDict } from '../data/dictionaries'
import { buildQueue, pickMode } from '../logic/sessionBuilder'
import { newCard, review } from '../logic/srs'
import { today } from '../logic/date'

export interface SessionItem { word: Word; mode: StudyMode; isNew: boolean }

export function useStudySession(dictId: string, settings: Settings) {
  const [words, setWords] = useState<Word[]>([])
  const [queue, setQueue] = useState<SessionItem[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState<{ word: Word; correct: boolean } | null>(null)
  const t = today()

  const cardsRef = useRef<WordCard[]>([])
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flushCards = useCallback(() => {
    if (writeTimer.current) clearTimeout(writeTimer.current)
    writeTimer.current = setTimeout(() => store.saveCards(cardsRef.current), 300)
  }, [])

  useEffect(() => {
    const meta = getDict(dictId)
    if (!meta) { setLoading(false); return }
    loadDict(meta.file).then(ws => {
      setWords(ws)
      const cards = store.loadCards()
      cardsRef.current = cards
      const daily = store.loadDaily().find(d => d.date === t)
      const newDoneToday = daily?.newWords ?? 0
      const q = buildQueue({ cards, words: ws, dictId, today: t, dailyNewTarget: settings.dailyNewTarget, newDoneToday })
      const cardByWord = new Map(cards.map(c => [c.word, c]))
      const items: SessionItem[] = [
        ...q.review.map(w => ({ word: w, mode: pickMode(cardByWord.get(w.name)), isNew: false })),
        ...q.newWords.map(w => ({ word: w, mode: 'choice' as StudyMode, isNew: true })),
      ].map(it => settings.forcedMode === 'auto' ? it : { ...it, mode: settings.forcedMode })
      setQueue(items)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [dictId]) // eslint-disable-line react-hooks/exhaustive-deps

  const current = queue[index]

  // 判分：更新卡片(SM-2) + 记录打卡，进入停留态（不切词）
  const submit = useCallback((correct: boolean) => {
    if (!current) return
    const cards = cardsRef.current
    const idx = cards.findIndex(c => c.dictId === dictId && c.word === current.word.name)
    const base = idx >= 0 ? cards[idx] : newCard(dictId, current.word.name, t)
    const updated = review(base, correct, t)
    if (idx >= 0) cards[idx] = updated; else cards.push(updated)
    flushCards()

    const remainingNew = queue.slice(index + 1).filter(i => i.isNew).length
    const doneNew = (store.loadDaily().find(d => d.date === t)?.newWords ?? 0) + (current.isNew ? 1 : 0)
    store.recordStudy(t, { isNew: current.isNew, goalReached: doneNew >= settings.dailyNewTarget && remainingNew === 0 })

    setReviewing({ word: current.word, correct })
  }, [current, dictId, index, queue, settings.dailyNewTarget, t, flushCards])

  // 切词：离开停留态并前进
  const next = useCallback(() => {
    setReviewing(null)
    setIndex(i => i + 1)
  }, [])

  useEffect(() => () => {
    if (writeTimer.current) { clearTimeout(writeTimer.current); store.saveCards(cardsRef.current) }
  }, [])

  const done = !loading && index >= queue.length
  const pool = useMemo(() => words, [words])

  return { loading, current, reviewing, done, pool, progress: { index, total: queue.length }, submit, next }
}
```

- [ ] **Step 2: 改页面 —— 用下面整段替换 `src/pages/StudySessionPage.tsx`**

```tsx
import { Link, useParams } from 'react-router-dom'
import { useStudySession } from '../hooks/useStudySession'
import { store } from '../services/storage'
import { ChoiceMode } from '../components/ChoiceMode'
import { DictationMode } from '../components/DictationMode'
import { SpellingMode } from '../components/SpellingMode'
import { ResultPanel } from '../components/ResultPanel'

export function StudySessionPage() {
  const { id = '' } = useParams()
  const settings = store.loadSettings()
  const { loading, current, reviewing, done, pool, progress, submit, next } = useStudySession(id, settings)

  if (loading) return <div className="p-8 text-center text-slate-400">加载中…</div>

  if (reviewing) {
    return (
      <div className="p-4 pb-20">
        <div className="text-sm text-slate-400 mb-2">{progress.index + 1} / {progress.total} · {current?.isNew ? '新词' : '复习'}</div>
        <div className="mt-4">
          <ResultPanel word={reviewing.word} correct={reviewing.correct} accent={settings.accent} onNext={next} />
        </div>
      </div>
    )
  }

  if (done || !current) {
    return (
      <div className="p-8 flex flex-col items-center gap-4">
        <div className="text-2xl">今日已完成 🎉</div>
        <Link to="/" className="text-blue-600">返回词库</Link>
      </div>
    )
  }

  return (
    <div className="p-4 pb-20">
      <div className="text-sm text-slate-400 mb-2">{progress.index + 1} / {progress.total} · {current.isNew ? '新词' : '复习'}</div>
      <div className="mt-8">
        {current.mode === 'choice' && <ChoiceMode word={current.word} pool={pool} settings={settings} onResult={submit} />}
        {current.mode === 'dictation' && <DictationMode word={current.word} settings={settings} onResult={submit} />}
        {current.mode === 'spelling' && <SpellingMode word={current.word} settings={settings} onResult={submit} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 认词微调 —— 在 `src/components/ChoiceMode.tsx` 改 `choose`**

把：
```tsx
  function choose(i: number) {
    if (picked !== null) return
    setPicked(i)
    const correct = i === correctIndex
    setTimeout(() => { setPicked(null); onResult(correct) }, 900)
  }
```
改为（高亮 0.8s 后只上报结果，切换由面板接管）：
```tsx
  function choose(i: number) {
    if (picked !== null) return
    setPicked(i)
    setTimeout(() => onResult(i === correctIndex), 800)
  }
```
（听写/拼写组件无需改动：它们在拼完整词时已是调用一次 `onResult`，现在由 hook 接管为"进入面板"。）

- [ ] **Step 4: 类型检查 + 构建 + 提交**

Run: `npx tsc --noEmit -p tsconfig.app.json` → 无错误
Run: `npm run build` → 构建成功
Run: `npm test` → 仍 73+ 全绿（纯逻辑未动）
```
git add src/hooks/useStudySession.ts src/pages/StudySessionPage.tsx src/components/ChoiceMode.tsx
git commit -m "feat: pause after answer; show ResultPanel; manual next"
```

---

## Task 4: 端到端验证 + 文档同步

**Files:**
- Modify: `设计文档-iOS背单词App.md`（上一级目录，§4/§5.1）

- [ ] **Step 1: Playwright 验证（dev server 已在 5173）**

写临时脚本 `.\.e2e_check.py`（验证后删除，不提交）：
```python
import json
from playwright.sync_api import sync_playwright
BASE = "http://localhost:5173/"
errs = []
with sync_playwright() as p:
    pg = p.chromium.launch(headless=True).new_page(viewport={"width":390,"height":800})
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(BASE, wait_until="networkidle")
    pg.evaluate("localStorage.clear()")
    pg.reload(wait_until="networkidle")
    pg.click("text=高考 3500 词"); pg.wait_for_selector("text=开始学习"); pg.click("text=开始学习")
    pg.wait_for_selector("button.border-2", timeout=10000); pg.wait_for_timeout(400)
    pg.locator("button.border-2").first.click()
    # 答完应出现停留面板（不自动切词）
    pg.wait_for_selector("text=下一个", timeout=5000)
    body = pg.inner_text("body")
    assert ("✓ 答对" in body) or ("✗ 答错" in body), "no correctness badge"
    assert "释义" in body, "no meanings section"
    pg.wait_for_timeout(300)
    pg.screenshot(path=".e2e_panel.png", full_page=True)
    # 点下一个应前进到下一题（再次出现选项或完成）
    pg.click("text=下一个")
    pg.wait_for_timeout(500)
    assert ("button.border-2" in pg.content()) or ("今日已完成" in pg.inner_text("body")) or (pg.locator("button.border-2").count() > 0)
    print("PANEL+NEXT OK; errors:", errs)
```
Run: `python .\.e2e_check.py`
Expected: 打印 `PANEL+NEXT OK; errors: []`；`.e2e_panel.png` 显示对错徽标 + 单词 + 音标 + 释义列表 + 在线用法区 + 「下一个」。

- [ ] **Step 2: 看截图确认布局**，确认无误后清理：
```
Remove-Item .e2e_check.py, .e2e_panel.png -ErrorAction SilentlyContinue
```

- [ ] **Step 3: 同步设计文档**

在上一级 `设计文档-iOS背单词App.md`：
- §4 学习流程：把"全对→完成切下一词"改为"答完→弹出结果面板（对错都停留）→ 用户点「下一个」（桌面 Enter/空格）切词"。
- §5.1：在三模式末尾补一段"**结果面板**：答完展示对错、完整中文释义、美/英音标、🔊、在线例句/词性/近义词（dictionaryapi.dev，离线降级），手动进入下一词"。

- [ ] **Step 4: 提交**

```
git add ../设计文档-iOS背单词App.md
git commit -m "docs: update flow for post-answer review panel"
```

> 说明：词库数据未变，**不影响** `dicts.accuracy` 测试与 SHA-256 校验和。在线用法为运行时获取，不进词库文件。

---

## Task 5: 错词派生 selectWrongWords（TDD）

**Files:**
- Create: `src/logic/wrongBook.ts`
- Test: `src/logic/wrongBook.test.ts`

- [ ] **Step 1: 写失败测试**

`src/logic/wrongBook.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { selectWrongWords } from './wrongBook'
import type { WordCard } from '../types'

const card = (over: Partial<WordCard>): WordCard => ({
  dictId: 'd', word: 'w', ease: 2.5, interval: 1, repetitions: 0,
  dueDate: '2026-06-01', wrongCount: 0, learned: true, ...over,
})

describe('selectWrongWords', () => {
  it('includes only wrongCount>0 and repetitions===0', () => {
    const cards = [
      card({ word: 'a', wrongCount: 1, repetitions: 0 }), // 在本
      card({ word: 'b', wrongCount: 0, repetitions: 0 }), // 没错过
      card({ word: 'c', wrongCount: 2, repetitions: 1 }), // 错过但已答对1次→出本
    ]
    expect(selectWrongWords(cards).map(c => c.word)).toEqual(['a'])
  })
  it('a word answered correctly once leaves the book', () => {
    expect(selectWrongWords([card({ wrongCount: 3, repetitions: 1 })])).toEqual([])
  })
  it('spans dicts', () => {
    const cards = [
      card({ dictId: 'd1', word: 'a', wrongCount: 1, repetitions: 0 }),
      card({ dictId: 'd2', word: 'b', wrongCount: 3, repetitions: 0 }),
    ]
    expect(selectWrongWords(cards).length).toBe(2)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npm test -- wrongBook`
Expected: FAIL（找不到 `./wrongBook`）。

- [ ] **Step 3: 实现**

`src/logic/wrongBook.ts`:
```ts
import type { WordCard } from '../types'

/** 错词本成员：答错过且尚未答对（repetitions 归 0）。答对 1 次后 repetitions 变 1，自动移出。 */
export function selectWrongWords(cards: WordCard[]): WordCard[] {
  return cards.filter(c => c.wrongCount > 0 && c.repetitions === 0)
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npm test -- wrongBook`
Expected: PASS。

- [ ] **Step 5: 提交**

```
git add src/logic/wrongBook.ts src/logic/wrongBook.test.ts
git commit -m "feat: selectWrongWords (derived wrong-words from cards)"
```

---

## Task 6: 错词本页 + 标签 + 统计口径

**Files:**
- Create: `src/pages/WrongBookPage.tsx`
- Modify: `src/components/TabBar.tsx`（加「错词」标签）
- Modify: `src/pages/StatsPage.tsx`（错词数口径）
- Modify: `src/App.tsx`（加 `/wrong` 路由）

- [ ] **Step 1: 错词本页**

`src/pages/WrongBookPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { store } from '../services/storage'
import { selectWrongWords } from '../logic/wrongBook'
import { getDict } from '../data/dictionaries'
import { loadDict } from '../services/dictionaryLoader'
import type { Word } from '../types'

interface Row { word: string; dictName: string; trans: string; wrongCount: number }

export function WrongBookPage() {
  const [rows, setRows] = useState<Row[] | null>(null)

  useEffect(() => {
    const cards = selectWrongWords(store.loadCards())
    const dictIds = [...new Set(cards.map(c => c.dictId))]
    Promise.all(dictIds.map(id => {
      const meta = getDict(id)
      return meta ? loadDict(meta.file).then(ws => [id, ws] as const) : Promise.resolve([id, [] as Word[]] as const)
    })).then(pairs => {
      const byDict = new Map<string, Word[]>(pairs)
      const rs: Row[] = cards.map(c => {
        const w = (byDict.get(c.dictId) ?? []).find(x => x.name === c.word)
        return { word: c.word, dictName: getDict(c.dictId)?.name ?? c.dictId, trans: w?.trans[0] ?? '', wrongCount: c.wrongCount }
      })
      setRows(rs)
    }).catch(() => setRows([]))
  }, [])

  if (rows === null) return <div className="p-8 text-center text-slate-400">加载中…</div>
  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold mb-4">错词本</h1>
      {rows.length === 0 ? (
        <div className="text-center text-slate-400 mt-12">还没有错词 🎉</div>
      ) : (
        <>
          <Link to="/review-wrong" className="block text-center bg-blue-600 text-white rounded-full px-6 py-3 mb-4 transition-transform active:scale-95">
            重练错词（{rows.length}）
          </Link>
          {rows.map((r, i) => (
            <div key={i} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
              <div className="flex justify-between items-baseline">
                <span className="font-semibold text-lg">{r.word}</span>
                <span className="text-xs text-red-400">错 {r.wrongCount} 次</span>
              </div>
              <div className="text-sm text-slate-500">{r.trans}</div>
              <div className="text-xs text-slate-300 mt-1">{r.dictName}</div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TabBar 加「错词」**

把 `src/components/TabBar.tsx` 的 `<nav>` 内容替换为：
```tsx
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t flex">
      <NavLink to="/" className={active} end>词库</NavLink>
      <NavLink to="/stats" className={active}>统计</NavLink>
      <NavLink to="/wrong" className={active}>错词</NavLink>
      <NavLink to="/settings" className={active}>设置</NavLink>
    </nav>
```

- [ ] **Step 3: StatsPage 错词数口径对齐**

在 `src/pages/StatsPage.tsx`：顶部加 `import { selectWrongWords } from '../logic/wrongBook'`，并把
```tsx
  const wrong = cards.filter(c => c.wrongCount > 0).length
```
改为
```tsx
  const wrong = selectWrongWords(cards).length
```

- [ ] **Step 4: App 加 `/wrong` 路由**

在 `src/App.tsx`：加 `import { WrongBookPage } from './pages/WrongBookPage'`，并在 `<Routes>` 内 `/stats` 之后加：
```tsx
        <Route path="/wrong" element={<WrongBookPage />} />
```

- [ ] **Step 5: 类型检查 + 构建 + 提交**

Run: `npx tsc --noEmit -p tsconfig.app.json` → 无错误（`/review-wrong` 链接此刻指向尚未注册的路由，仅是字符串，不影响编译；Task 7 注册它）
Run: `npm run build` → 成功
```
git add src/pages/WrongBookPage.tsx src/components/TabBar.tsx src/pages/StatsPage.tsx src/App.tsx
git commit -m "feat: wrong-words book page + tab + stats alignment"
```

---

## Task 7: 错词重练 hook + 页面

**Files:**
- Create: `src/hooks/useWrongReview.ts`
- Create: `src/pages/WrongReviewPage.tsx`
- Modify: `src/App.tsx`（加 `/review-wrong` 路由）

- [ ] **Step 1: 重练 hook**

`src/hooks/useWrongReview.ts`:
```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Word, Settings, StudyMode, WordCard } from '../types'
import { store } from '../services/storage'
import { loadDict } from '../services/dictionaryLoader'
import { getDict } from '../data/dictionaries'
import { pickMode } from '../logic/sessionBuilder'
import { selectWrongWords } from '../logic/wrongBook'
import { newCard, review } from '../logic/srs'
import { today } from '../logic/date'

export interface WrongItem { word: Word; dictId: string; pool: Word[]; mode: StudyMode }

export function useWrongReview(settings: Settings) {
  const [items, setItems] = useState<WrongItem[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState<{ word: Word; correct: boolean } | null>(null)
  const t = today()

  const cardsRef = useRef<WordCard[]>([])
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flushCards = useCallback(() => {
    if (writeTimer.current) clearTimeout(writeTimer.current)
    writeTimer.current = setTimeout(() => store.saveCards(cardsRef.current), 300)
  }, [])

  useEffect(() => {
    const cards = store.loadCards()
    cardsRef.current = cards
    const wrong = selectWrongWords(cards)
    const dictIds = [...new Set(wrong.map(c => c.dictId))]
    Promise.all(dictIds.map(id => {
      const meta = getDict(id)
      return meta ? loadDict(meta.file).then(ws => [id, ws] as const) : Promise.resolve([id, [] as Word[]] as const)
    })).then(pairs => {
      const byDict = new Map<string, Word[]>(pairs)
      const its: WrongItem[] = []
      for (const c of wrong) {
        const ws = byDict.get(c.dictId) ?? []
        const word = ws.find(x => x.name === c.word)
        if (!word) continue
        const mode: StudyMode = settings.forcedMode === 'auto' ? pickMode(c) : settings.forcedMode
        its.push({ word, dictId: c.dictId, pool: ws, mode })
      }
      setItems(its); setLoading(false)
    }).catch(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const current = items[index]

  const submit = useCallback((correct: boolean) => {
    if (!current) return
    const cards = cardsRef.current
    const idx = cards.findIndex(c => c.dictId === current.dictId && c.word === current.word.name)
    const base = idx >= 0 ? cards[idx] : newCard(current.dictId, current.word.name, t)
    const updated = review(base, correct, t)
    if (idx >= 0) cards[idx] = updated; else cards.push(updated)
    flushCards()
    store.recordStudy(t, { isNew: false, goalReached: false })
    setReviewing({ word: current.word, correct })
  }, [current, t, flushCards])

  const next = useCallback(() => { setReviewing(null); setIndex(i => i + 1) }, [])

  useEffect(() => () => {
    if (writeTimer.current) { clearTimeout(writeTimer.current); store.saveCards(cardsRef.current) }
  }, [])

  const done = !loading && index >= items.length
  return { loading, current, reviewing, done, progress: { index, total: items.length }, submit, next }
}
```

- [ ] **Step 2: 重练页**

`src/pages/WrongReviewPage.tsx`:
```tsx
import { Link } from 'react-router-dom'
import { useWrongReview } from '../hooks/useWrongReview'
import { store } from '../services/storage'
import { ChoiceMode } from '../components/ChoiceMode'
import { DictationMode } from '../components/DictationMode'
import { SpellingMode } from '../components/SpellingMode'
import { ResultPanel } from '../components/ResultPanel'

export function WrongReviewPage() {
  const settings = store.loadSettings()
  const { loading, current, reviewing, done, progress, submit, next } = useWrongReview(settings)

  if (loading) return <div className="p-8 text-center text-slate-400">加载中…</div>

  if (reviewing) {
    return (
      <div className="p-4 pb-20">
        <div className="text-sm text-slate-400 mb-2">{progress.index + 1} / {progress.total} · 错词重练</div>
        <div className="mt-4">
          <ResultPanel word={reviewing.word} correct={reviewing.correct} accent={settings.accent} onNext={next} />
        </div>
      </div>
    )
  }

  if (done || !current) {
    return (
      <div className="p-8 flex flex-col items-center gap-4">
        <div className="text-2xl">错词已练完 🎉</div>
        <Link to="/wrong" className="text-blue-600">返回错词本</Link>
      </div>
    )
  }

  return (
    <div className="p-4 pb-20">
      <div className="text-sm text-slate-400 mb-2">{progress.index + 1} / {progress.total} · 错词重练</div>
      <div className="mt-8">
        {current.mode === 'choice' && <ChoiceMode word={current.word} pool={current.pool} settings={settings} onResult={submit} />}
        {current.mode === 'dictation' && <DictationMode word={current.word} settings={settings} onResult={submit} />}
        {current.mode === 'spelling' && <SpellingMode word={current.word} settings={settings} onResult={submit} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: App 加 `/review-wrong` 路由**

在 `src/App.tsx`：加 `import { WrongReviewPage } from './pages/WrongReviewPage'`，并在 `<Routes>` 内加：
```tsx
        <Route path="/review-wrong" element={<WrongReviewPage />} />
```

- [ ] **Step 4: 类型检查 + 构建 + 全测 + 提交**

Run: `npx tsc --noEmit -p tsconfig.app.json` → 无错误
Run: `npm run build` → 成功
Run: `npm test` → 全绿（新增 lexicon/wrongBook 单测 + 原有）
```
git add src/hooks/useWrongReview.ts src/pages/WrongReviewPage.tsx src/App.tsx
git commit -m "feat: wrong-words re-practice session"
```

---

## Task 8: 端到端验证（含错词本）+ 文档同步

**Files:**
- Modify: `设计文档-iOS背单词App.md`（上一级目录）

- [ ] **Step 1: Playwright 验证全流程**

写临时脚本 `.\.e2e_check.py`（验证后删除，不提交）：
```python
import json
from playwright.sync_api import sync_playwright
BASE = "http://localhost:5173/"
errs = []
with sync_playwright() as p:
    pg = p.chromium.launch(headless=True).new_page(viewport={"width":390,"height":800})
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(BASE, wait_until="networkidle")
    pg.evaluate("localStorage.clear()")
    # 设为只拼写，方便制造一个错词
    pg.evaluate("localStorage.setItem('evw.settings', JSON.stringify({dailyNewTarget:15,accent:'us',soundOn:true,forcedMode:'spelling',ignoreCase:true}))")
    pg.goto(BASE + "#/study/gaokao3500", wait_until="networkidle")
    pg.wait_for_selector("div.font-mono", timeout=10000); pg.wait_for_timeout(400)
    word = pg.locator("div.font-mono").first.inner_text().replace("\n","").strip()
    # 故意打错首字母（制造 everWrong），再打对完成
    pg.locator("div.font-mono").first.click()
    pg.keyboard.type("z")            # 错一下
    pg.keyboard.type(word, delay=20) # 再正确打完
    pg.wait_for_selector("text=下一个", timeout=5000)
    assert ("✗ 答错" in pg.inner_text("body")), "should be marked wrong (typed a bad char)"
    pg.click("text=下一个"); pg.wait_for_timeout(400)
    # 去错词本，应能看到这个词
    pg.goto(BASE + "#/wrong", wait_until="networkidle")
    pg.wait_for_selector("text=错词本", timeout=8000)
    assert word in pg.inner_text("body"), f"{word} should be in wrong book"
    assert "重练错词" in pg.inner_text("body")
    pg.screenshot(path=".e2e_wrong.png", full_page=True)
    # 重练并答对 → 该词移出
    pg.click("text=重练错词"); pg.wait_for_selector("div.font-mono", timeout=8000); pg.wait_for_timeout(300)
    w2 = pg.locator("div.font-mono").first.inner_text().replace("\n","").strip()
    pg.locator("div.font-mono").first.click(); pg.keyboard.type(w2, delay=20)
    pg.wait_for_selector("text=下一个", timeout=5000); pg.click("text=下一个"); pg.wait_for_timeout(400)
    pg.goto(BASE + "#/wrong", wait_until="networkidle"); pg.wait_for_timeout(400)
    body = pg.inner_text("body")
    print("after re-practice, wrong book empty?", "还没有错词" in body, "| errors:", errs)
print("E2E DONE")
```
Run: `python .\.e2e_check.py`
Expected: 打印 `after re-practice, wrong book empty? True | errors: []`；`.e2e_wrong.png` 显示错词本含该词与「重练错词」按钮。

- [ ] **Step 2: 看截图确认，清理**
```
Remove-Item .e2e_check.py, .e2e_wrong.png, .e2e_panel.png -ErrorAction SilentlyContinue
```

- [ ] **Step 3: 同步设计文档**

在上一级 `设计文档-iOS背单词App.md`：
- §4：改为"答完→结果面板→手动下一个"（同 Task 4 Step 3）。
- §5 界面结构：底部 TabBar 改为「词库 / 统计 / 错词 / 设置」；新增 `/wrong WrongBookPage`、`/review-wrong WrongReviewPage` 两行。
- §5.1：补结果面板说明（同 Task 4 Step 3）。
- §1 第一期：「错词本」已实现（含重练）；§2 第二期的「错词强化专项」标注为已部分提前。

- [ ] **Step 4: 提交**

```
git add ../设计文档-iOS背单词App.md
git commit -m "docs: review panel + wrong-words book in flow & UI"
```

> 注：Task 4 与 Task 8 都改 `设计文档` §4/§5.1，按实际执行顺序合并改一次即可，避免重复。

---

## 自检（spec 覆盖）

- 停留 + 手动下一个 → Task 3（hook reviewing/next + 页面）✅
- 完整释义 + 音标 → Task 2 ResultPanel（`word.trans` 全部 + us/uk）✅
- 短语/例句/其他用法 + 离线降级 → Task 1 lexicon + Task 2 在线区（loading/data/none）✅
- 三模式不再自动切词 → Task 3（认词微调；听写/拼写经 hook 改变语义）✅
- 错词本成员派生（答错进/答对出）→ Task 5 `selectWrongWords` ✅
- 错词本列表 + 入口标签 + 统计口径 → Task 6 ✅
- 重练错词（复用面板/模式）→ Task 7 `useWrongReview` + `WrongReviewPage` ✅
- 测试：lexicon 单测 Task 1、wrongBook 单测 Task 5；面板/错词本 e2e Task 4+8；现有 73 单测回归（未改 srs/WordCard）✅
- 文档同步 → Task 4 + Task 8 ✅
- 类型一致性核对：`useStudySession` 与 `useWrongReview` 返回同形 `{loading,current,reviewing,done,progress,submit,next}`；`current.mode`/`current.pool`(重练) 与页面渲染匹配；`ResultPanel` props `{word,correct,accent,onNext}` 在两处调用一致 ✅
```
