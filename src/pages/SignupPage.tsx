import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { TextInput } from '../components/ui/TextInput'
import { Spinner } from '../components/ui/Spinner'

export function SignupPage() {
  const { session, loading: authLoading, signUp } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // 註冊成功但尚未取得 session（專案開啟信箱驗證時會這樣）
  const [justSignedUp, setJustSignedUp] = useState(false)

  // 已登入者進入此頁、或註冊後直接取得 session（未開信箱驗證）都導回首頁
  useEffect(() => {
    if (!authLoading && session) navigate('/', { replace: true })
  }, [authLoading, session, navigate])

  if (authLoading || session) {
    return <Spinner label={authLoading ? '確認登入狀態…' : '重新導向中…'} />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('兩次輸入的密碼不一致')
      return
    }
    setSubmitting(true)
    try {
      await signUp(email, password)
      setJustSignedUp(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '註冊失敗，請稍後再試')
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
          <p className="mt-1 text-sm text-slate-500">建立帳號，開始背單字</p>
        </div>

        {justSignedUp ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-600">
              註冊成功！請至信箱 <span className="font-medium text-slate-800">{email}</span>{' '}
              點擊確認連結後再登入。
            </p>
            <Link to="/login">
              <Button className="w-full">前往登入</Button>
            </Link>
          </div>
        ) : (
          <>
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <TextInput
                label="確認密碼"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />

              {error && <p className="text-sm text-rose-600">{error}</p>}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? '註冊中…' : '註冊'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              已經有帳號？{' '}
              <Link to="/login" className="font-medium text-indigo-600 hover:underline">
                立即登入
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
