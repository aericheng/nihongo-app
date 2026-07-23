import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function AppLayout() {
  const { session, signOut } = useAuth()
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="text-lg font-bold text-indigo-600">
            日語帳 <span className="font-jp text-sm text-slate-400">にほんごちょう</span>
          </Link>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Link to="/stats" className="rounded-lg px-3 py-1.5 hover:bg-slate-100">
              📊 統計
            </Link>
            <span className="hidden sm:inline">{session?.user.email}</span>
            <button onClick={signOut} className="rounded-lg px-3 py-1.5 hover:bg-slate-100">
              登出
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
