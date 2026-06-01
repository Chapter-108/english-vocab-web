import { Link, useParams } from 'react-router-dom'
import { getDict } from '../data/dictionaries'

export function TodayPage() {
  const { id = '' } = useParams()
  const meta = getDict(id)
  if (!meta) return <div className="p-4">词库不存在</div>
  return (
    <div className="p-4 pb-20 flex flex-col items-center gap-6">
      <h1 className="text-2xl font-bold mt-8">{meta.name}</h1>
      <p className="text-slate-500 text-center">今天来学一组单词吧。系统会自动安排新词和到期复习。</p>
      <Link to={`/study/${id}`} className="bg-blue-600 text-white rounded-full px-8 py-3 text-lg transition-transform active:scale-95">开始学习</Link>
      <Link to="/" className="text-slate-400">← 返回词库</Link>
    </div>
  )
}
