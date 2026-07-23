import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { HomePage } from './pages/HomePage'
import { LevelPage } from './pages/LevelPage'
import { StudySetPage } from './pages/StudySetPage'
import { FolderPage } from './pages/FolderPage'
import { StatsPage } from './pages/StatsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/level/:levelCode" element={<LevelPage />} />
          <Route path="/sets/:setId" element={<StudySetPage />} />
          <Route path="/folders/:folderId" element={<FolderPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
