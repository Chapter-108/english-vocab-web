import { HashRouter, Routes, Route } from 'react-router-dom'
import { TabBar } from './components/TabBar'
import { DictionaryListPage } from './pages/DictionaryListPage'
import { TodayPage } from './pages/TodayPage'
import { StudySessionPage } from './pages/StudySessionPage'
import { StatsPage } from './pages/StatsPage'
import { WrongBookPage } from './pages/WrongBookPage'
import { WrongReviewPage } from './pages/WrongReviewPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<DictionaryListPage />} />
        <Route path="/dict/:id" element={<TodayPage />} />
        <Route path="/study/:id" element={<StudySessionPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/wrong" element={<WrongBookPage />} />
        <Route path="/review-wrong" element={<WrongReviewPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <TabBar />
    </HashRouter>
  )
}
