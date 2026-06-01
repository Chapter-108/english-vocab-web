// 一次性清洗 gaokao3500.json（满足"词库内容准确无误"硬指标）：
//  1) 删除 2 条贴错义项的错误条目（ad 的 "离开…"、war 的 "warn" 义）
//  2) 同名（区分大小写）条目合并为单条：释义合并去重、保留首条非空音标
// 运行：node scripts/clean-gaokao.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const path = 'public/dicts/gaokao3500.json'
const data = JSON.parse(readFileSync(path, 'utf8'))

// 1) 明确错误的条目，整条删除
const WRONG = [
  { name: 'ad', trans: '.离开；（电自来水）停了,中断' },
  { name: 'war', trans: 'n vt. 警告，预先通知' },
]
const isWrong = (w) => WRONG.some((x) => x.name === w.name && w.trans.includes(x.trans))
const filtered = data.filter((w) => !isWrong(w))

// 2) 同名合并（区分大小写，保持首次出现顺序）
const order = []
const byName = new Map()
for (const w of filtered) {
  if (!byName.has(w.name)) {
    byName.set(w.name, { name: w.name, usphone: w.usphone, ukphone: w.ukphone, trans: [...w.trans] })
    order.push(w.name)
  } else {
    const e = byName.get(w.name)
    for (const t of w.trans) if (!e.trans.includes(t)) e.trans.push(t)
    if (!e.usphone && w.usphone) e.usphone = w.usphone
    if (!e.ukphone && w.ukphone) e.ukphone = w.ukphone
  }
}
const cleaned = order.map((n) => byName.get(n))

writeFileSync(path, JSON.stringify(cleaned, null, 4), 'utf8')
console.log(`before=${data.length} after=${cleaned.length} removed=${data.length - cleaned.length}`)
