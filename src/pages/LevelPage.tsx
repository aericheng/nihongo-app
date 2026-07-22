import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createStudySet, deleteStudySet, getLevelByCode, listStudySets } from '../lib/api'
import type { Level, StudySet } from '../lib/types'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { TextInput } from '../components/ui/TextInput'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { Breadcrumb } from '../features/nav/Breadcrumb'

export function LevelPage() {
  const { levelCode } = useParams<{ levelCode: string }>()
  const navigate = useNavigate()

  const [level, setLevel] = useState<Level | null>(null)
  const [sets, setSets] = useState<StudySet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [modalError, setModalError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const lvl = await getLevelByCode(levelCode ?? '')
        const list = await listStudySets(lvl.id)
        if (!cancelled) {
          setLevel(lvl)
          setSets(list)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '讀取失敗')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [levelCode])

  function openModal() {
    setNewName('')
    setModalError('')
    setModalOpen(true)
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!level || !newName.trim()) return
    setCreating(true)
    setModalError('')
    try {
      const created = await createStudySet(level.id, newName)
      setSets((prev) => [...prev, created])
      setModalOpen(false)
    } catch (err) {
      setModalError(err instanceof Error ? err.message : '建立失敗')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(set: StudySet) {
    if (!window.confirm(`確定要刪除資料集「${set.name}」嗎？此動作無法復原。`)) return
    try {
      await deleteStudySet(set.id)
      setSets((prev) => prev.filter((s) => s.id !== set.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除失敗')
    }
  }

  const displayCode = level?.code ?? (levelCode ?? '').toUpperCase()

  return (
    <div>
      <Breadcrumb items={[{ label: '首頁', to: '/' }, { label: displayCode }]} />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{displayCode} 資料集</h1>
        <Button onClick={openModal} disabled={loading || !level}>
          ＋ 新增資料集
        </Button>
      </div>

      {loading && <Spinner />}

      {!loading && error && <p className="text-sm text-rose-600">{error}</p>}

      {!loading && !error && sets.length === 0 && (
        <EmptyState icon="📁" message="還沒有資料集，點右上角「＋ 新增資料集」開始建立吧" />
      )}

      {!loading && !error && sets.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((set) => (
            <div
              key={set.id}
              onClick={() => navigate(`/sets/${set.id}`)}
              className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-medium text-slate-800">{set.name}</h2>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(set)
                  }}
                  aria-label="刪除資料集"
                  className="shrink-0 rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                >
                  ✕
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                建立於 {new Date(set.created_at).toLocaleDateString('zh-TW')}
              </p>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} title="新增資料集" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <TextInput
            label="資料集名稱"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            required
          />
          {modalError && <p className="text-sm text-rose-600">{modalError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button type="submit" disabled={creating || !newName.trim()}>
              {creating ? '建立中…' : '建立'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
