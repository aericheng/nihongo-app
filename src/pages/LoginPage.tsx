import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { TextInput } from '../components/ui/TextInput'
import { Spinner } from '../components/ui/Spinner'

export function LoginPage() {
  const { session, loading: authLoading, signIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 已登入者進入此頁時自動導回首頁
  useEffect(() => {
    if (!authLoading && session) navigate('/', { replace: true })
  }, [authLoading, session, navigate])

  if (authLoading || session) {
    return <Spinner label={authLoading ? '確認登入狀態…' : '重新導向中…'} />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '登入失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-indigo-600">
            日語帳 <span className="font-jp text-sm text-slate-400">にほんごちょう</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">登入以繼續學習</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <TextInput
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <TextInput
            label="密碼"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? '登入中…' : '登入'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          還沒有帳號？{' '}
          <Link to="/signup" className="font-medium text-indigo-600 hover:underline">
            立即註冊
          </Link>
        </p>
      </div>
    </div>
  )
}
