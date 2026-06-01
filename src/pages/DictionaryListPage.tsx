import { Link } from 'react-router-dom'
import { DICTIONARIES } from '../data/dictionaries'
import type { Level } from '../types'

const LEVELS: { key: Level; label: string }[] = [
  { key: 'beginner', label: '入门' }, { key: 'intermediate', label: '中级' }, { key: 'advanced', label: '进阶' },
]

export function DictionaryListPage() {
  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold mb-4">选择词库</h1>
      {LEVELS.map(lv => (
        <div key={lv.key} className="mb-6">
          <h2 className="text-slate-400 mb-2">{lv.label}</h2>
          {DICTIONARIES.filter(d => d.level === lv.key).map(d => (
            <Link key={d.id} to={`/dict/${d.id}`} className="block bg-white rounded-xl p-4 mb-3 shadow-sm transition-transform active:scale-[0.99]">
              <div className="font-semibold">{d.name}</div>
              <div className="text-sm text-slate-500">{d.description} · {d.length} 词</div>
            </Link>
          ))}
        </div>
      ))}
    </div>
  )
}
