import { store } from '../services/storage'
import { today } from '../logic/date'
import { selectWrongWords } from '../logic/wrongBook'

export function StatsPage() {
  const t = today()
  const streak = store.streak(t)
  const cards = store.loadCards()
  const learned = cards.filter(c => c.learned).length
  const wrong = selectWrongWords(cards).length
  const todayRec = store.loadDaily().find(d => d.date === t)
  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold mb-4">学习统计</h1>
      <div className="grid grid-cols-2 gap-4">
        <Stat label="连续打卡" value={`${streak} 天`} />
        <Stat label="累计已学" value={`${learned} 词`} />
        <Stat label="今日新词" value={`${todayRec?.newWords ?? 0}`} />
        <Stat label="错词数" value={`${wrong}`} />
      </div>
    </div>
  )
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div className="bg-white rounded-xl p-4 shadow-sm"><div className="text-slate-400 text-sm">{label}</div><div className="text-2xl font-bold">{value}</div></div>
}
