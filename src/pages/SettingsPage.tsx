import { useState } from 'react'
import { store } from '../services/storage'
import type { Settings } from '../types'

export function SettingsPage() {
  const [s, setS] = useState<Settings>(store.loadSettings())
  function update(patch: Partial<Settings>) { const next = { ...s, ...patch }; setS(next); store.saveSettings(next) }
  return (
    <div className="p-4 pb-20 flex flex-col gap-5">
      <h1 className="text-2xl font-bold">设置</h1>
      <label className="flex justify-between items-center">每日新词目标
        <input type="number" min={1} max={100} value={s.dailyNewTarget}
          onChange={e => update({ dailyNewTarget: Number(e.target.value) })} className="border rounded px-2 py-1 w-20" />
      </label>
      <label className="flex justify-between items-center">发音口音
        <select value={s.accent} onChange={e => update({ accent: e.target.value as Settings['accent'] })} className="border rounded px-2 py-1">
          <option value="us">美音</option><option value="uk">英音</option>
        </select>
      </label>
      <label className="flex justify-between items-center">学习模式
        <select value={s.forcedMode} onChange={e => update({ forcedMode: e.target.value as Settings['forcedMode'] })} className="border rounded px-2 py-1">
          <option value="auto">自动（由易到难）</option><option value="choice">只认词</option>
          <option value="dictation">只听写</option><option value="spelling">只拼写</option>
        </select>
      </label>
      <label className="flex justify-between items-center">忽略大小写
        <input type="checkbox" checked={s.ignoreCase} onChange={e => update({ ignoreCase: e.target.checked })} />
      </label>
    </div>
  )
}
