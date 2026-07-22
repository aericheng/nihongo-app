import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../ui/Spinner'

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  if (loading) return <Spinner label="確認登入狀態…" />
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}
