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
