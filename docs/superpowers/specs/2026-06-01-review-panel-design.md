# 设计规格：答题后停留 + 释义/用法面板

> 日期：2026-06-01　状态：已确认，待转实现计划
> 关联：《设计文档-iOS背单词App.md》§4 学习流程、§5.1 三种模式

## 1. 目标与动机

当前三种学习模式答完后**自动切到下一词**，且只显示第一条中文释义。用户希望：

1. 答完后**停留**，由用户**自主决定**何时进入下一个单词（不自动切词）。
2. 答题后展示更丰富的信息：**完整中文释义 + 音标 + 短语/例句/其他相关用法**。

## 2. 范围

### 做
- 三种模式（认词/听写/拼写）答完后不自动切词，弹出「结果面板」，对错都停留。
- 结果面板：对错徽标、单词、🔊 重听、美/英音标、**全部**中文释义、在线用法区（词性/英文释义/例句/近义词）、「下一个」按钮（桌面 Enter/空格）。
- 在线用法来自免费词典 API（dictionaryapi.dev），**内存 + localStorage 双缓存**，离线/失败时降级为仅本地释义。
- **错词本**（详见 §9）：底部新增「错词」标签；列出当前错词（单词+释义+错次），可一键「重练错词」进入只含错词的学习；答对 1 次自动移出错词本。

### 不做（YAGNI）
- 面板上的「加入错词本」按钮——错词本**自动**收录答错的词，无需手动加。
- 「收藏」功能。
- 中文例句（dictionaryapi.dev 为英英，无中文例句）。
- 真人发音音频播放（仍用现有 Web Speech TTS；API 返回的 audio 字段本期不接）。
- 错词本"连对 N 次才移除"的可配置项（本期固定 N=1：答对 1 次即移出；阈值留作以后设置项）。

## 3. 交互流程

```
答题 → 模式 onResult(correct)
     → hook.submit：更新卡片(SM-2) + recordStudy + 置 reviewing 态（不切词）
     → StudySessionPage 渲染 ResultPanel（本地释义即时显示 + 在线用法异步填充）
     → 用户点「下一个 →」/ 按 Enter/空格
     → hook.next()：清 reviewing + index+1 → 渲染下一词的模式
```

- **认词**：选项点击后仍先高亮正确/错误项约 0.8s，再 `onResult` 转面板。
- **听写/拼写**：打完整词（`complete`）即 `onResult` 转面板。
- **判分即记录**：卡片更新与打卡发生在 `submit`（进入面板时），因此停在面板上进度也不丢。

## 4. 模块设计

### 4.1 `src/services/lexicon.ts`（新，可单测）

```ts
export interface WordSense { partOfSpeech: string; definition: string; example?: string; synonyms: string[] }
export interface WordDetails { word: string; phonetic?: string; meanings: WordSense[] }

// 纯函数：解析 dictionaryapi.dev 的返回 → WordDetails；脏/空输入返回 null
export function parseLexicon(word: string, data: unknown): WordDetails | null

// 联网拉取 + 内存&localStorage 双缓存；离线/失败返回缓存或 null（不抛）
export async function fetchWordDetails(word: string): Promise<WordDetails | null>
```

- 端点：`GET https://api.dictionaryapi.dev/api/v2/entries/en/<word>`（支持浏览器 CORS）。
- 解析：取 `meanings[].partOfSpeech` + 每个 `definitions[0].{definition,example}` + `synonyms`；`phonetic` 取顶层或 `phonetics[].text` 第一个非空。每词性最多取 1~2 条释义，控制面板长度。
- 缓存键：`evw.lex.<word>`（localStorage）+ 进程内 `Map`。命中缓存不再发请求。
- 离线/网络错误/404：先查缓存，无则返回 `null`（调用方据此显示"暂无更多用法"）。

### 4.2 `src/components/ResultPanel.tsx`（新）

- props：`{ word: Word; correct: boolean; accent; onNext: () => void }`
- 即时渲染：对错徽标、`word.name` + 🔊（`speak`）、美/英音标、`word.trans` 全部条目。
- 在线区：`useEffect` 调 `fetchWordDetails(word.name)`；状态 `loading | data | none`。
  - `loading`：占位"加载用法中…"
  - `data`：列出词性 + 英文释义 + 例句（斜体引号）+ 近义词
  - `none`：显示"暂无更多用法（离线或未收录）"
- 「下一个 →」按钮调用 `onNext`；`window` 级 `keydown` 监听 Enter/空格 → `onNext`（卸载时移除）。

### 4.3 三个模式组件（改）

- 移除完成后的 `setTimeout(() => onResult(...))` 自动切词逻辑。
- 认词：点击 → 高亮 0.8s → `onResult(correct)`（之后由面板接管，不再 `setPicked(null)`）。
- 听写/拼写：`next.complete` 时 `onResult(!everWrong.current)`（可保留极短延时让最后一个字母显示）。
- 模式组件不再关心"下一个"。

### 4.4 `useStudySession` hook（改）

- 新增 `const [reviewing, setReviewing] = useState<{ word: Word; correct: boolean } | null>(null)`。
- `submit(correct)`：保留现有卡片更新（内存 + 防抖写盘）+ `recordStudy`；末尾改为 `setReviewing({ word: current.word, correct })`，**不再 `setIndex+1`**。
- 新增 `next()`：`setReviewing(null); setIndex(i => i + 1)`。
- 返回值加上 `reviewing` 与 `next`。
- `done` 判定不变（`index >= queue.length`）。

### 4.5 `StudySessionPage`（改）

```
if (reviewing) → <ResultPanel word={reviewing.word} correct={reviewing.correct} accent settings onNext={next} />
else           → 当前词的模式组件（onResult={submit}）
```
进度条 `index+1 / total` 在面板态也照常显示。

## 5. 离线与 PWA

- 在线用法依赖网络；**已查过的词写入 localStorage**，离线复习仍可见用法。
- 纯离线 / API 不可达：本地完整释义 + 音标 + Web Speech TTS 始终可用，面板在线区显示降级文案。
- 不改动现有 workbox 预缓存策略（跨域 API 不进预缓存；localStorage 缓存即离线兜底）。

## 6. 错误与边界

- API 404（词未收录，如缩写/专名）→ `null` → "暂无更多用法"。
- 网络超时/CORS 失败 → 同降级处理，不抛错、不阻塞面板。
- `word.trans` 多条全部展示；空 trans 不会出现（数据已校验）。
- 面板态下原输入框已卸载，不会误捕获 Enter/空格。

## 7. 测试策略

- **单测（Vitest）**
  - `parseLexicon`：单/多词性、有/无例句、有/无近义词、缺 `phonetic`、空数组、非数组脏输入 → 期望结构正确或 `null`。
  - `fetchWordDetails`：mock `fetch` 成功 → 返回并写缓存、二次调用不再 fetch；mock 失败/离线 → 返回 localStorage 缓存或 `null`。
- **端到端（Playwright）**：答一题 → 出现结果面板含完整释义与「下一个」→ 点击后切到下一词；mock 离线时面板显示降级文案。
- **回归**：现有 73 单测不受影响；旧 e2e 的"自动切词"断言改为"点下一个"。

## 8. 文档同步

- 更新《设计文档-iOS背单词App.md》§4（去掉"全对→自动切下一词"，改为"答完→停留面板→手动下一个")与 §5.1（补充结果面板）。
- 数据模型不变（Word 仍只有 name/trans/usphone/ukphone；用法为运行时在线获取，不进词库文件，故**不影响词库准确性测试与校验和**）。

## 9. 错词本（列表 + 重练）

### 9.1 成员判定（派生，零 srs 改动）

错词本成员**完全由现有 `WordCard` 字段派生**，不新增字段、不改 `srs.review`：

```
错词 = 卡片满足 wrongCount > 0 且 repetitions === 0
```

原理：SM-2 里答错 `repetitions` 归 0、`wrongCount++`（进本）；答对 `repetitions` 从 0 变 1（出本）。所以"答错进本、答对 1 次出本"天然成立。封装为纯函数 `selectWrongWords(cards)`，可单测。

> "连对 N 次才移除"本期固定 N=1（`repetitions === 0` 即在本）。未来若做设置项，改为 `repetitions < N` 即可。

### 9.2 错词本页（`WrongBookPage`，路由 `/wrong`）

- 读 `store.loadCards()` → `selectWrongWords` → 按 `dictId` 分组，`loadDict` 拉相关词库取释义。
- 列表项：单词 + 首条中文释义 + 所属词库 + 「错 N 次」。
- 顶部「重练错词（N）」按钮 → 路由 `/review-wrong`；N=0 时按钮禁用，显示空状态「还没有错词 🎉」。
- 跨词库统一展示（所有词库的错词汇总）。

### 9.3 重练（`useWrongReview` hook + `WrongReviewPage`，路由 `/review-wrong`）

- 加载一次：`selectWrongWords` → 分组 `loadDict` → 构造 `items: { word, dictId, pool, mode }[]`，`mode = forcedMode==='auto' ? pickMode(card) : forcedMode`，`pool` 为该词所属词库的词表（供认词干扰项）。
- 复用与主学习相同的「判分→停留面板→下一个」流程：`submit(correct)` 更新卡片(SM-2) + `recordStudy(isNew:false, goalReached:false)` + 置 `reviewing`；`next()` 切词。答对 → `repetitions` 变 1 → 该词下次进错词本时已移出。
- 复用 `ResultPanel`、三个模式组件。
- 全部练完 → 「本轮错词已完成 🎉」+ 返回。

### 9.4 入口与统计

- `TabBar` 增加「错词」标签：词库 / 统计 / 错词 / 设置（4 个）。
- `App` 增加路由 `/wrong`、`/review-wrong`。
- `StatsPage` 的「错词数」改用 `selectWrongWords(cards).length`（与错词本口径一致，避免历史值与当前本数量不一致）。

### 9.5 测试（错词本）

- **单测**：`selectWrongWords`——答错进本、答对 1 次出本、再答错重新进本、wrongCount=0 不在本、跨 dictId 都纳入。
- **e2e**：制造一个错词（拼写故意打错 → 答对完成 → 进入错词本可见）→ 「错词」标签显示该词 → 重练答对 → 该词移出。
- 现有 srs/storage 单测不受影响（未改 `WordCard`/`review`）。
