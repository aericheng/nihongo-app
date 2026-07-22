import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { countCardsByFolder, createFolder, deleteFolder, getStudySet, listFolders } from '../lib/api'
import { FOLDER_CAPACITY, suggestNextFolderName, type Folder, type StudySet } from '../lib/types'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { TextInput } from '../components/ui/TextInput'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { Breadcrumb, type BreadcrumbItem } from '../features/nav/Breadcrumb'

// 級別 id → code 的靜態對照，與 DB seed 一致：N1 id=1 … N5 id=5
const LEVEL_CODES: Record<number, string> = { 1: 'N1', 2: 'N2', 3: 'N3', 4: 'N4', 5: 'N5' }

export function StudySetPage() {
  const { setId } = useParams<{ setId: string }>()
  const navigate = useNavigate()

  const [set, setSet] = useState<StudySet | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [modalError, setModalError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!setId) return
      setLoading(true)
      setError('')
      try {
        const s = await getStudySet(setId)
        const [folderList, cardCounts] = await Promise.all([listFolders(setId), countCardsByFolder(setId)])
        if (!cancelled) {
          setSet(s)
          setFolders(folderList)
          setCounts(cardCounts)
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
  }, [setId])

  function openModal() {
    setNewName(suggestNextFolderName(folders.length))
    setModalError('')
    setModalOpen(true)
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!setId || !newName.trim()) return
    setCreating(true)
    setModalError('')
    try {
      const created = await createFolder(setId, newName, folders.length)
      setFolders((prev) => [...prev, created])
      setModalOpen(false)
    } catch (err) {
      setModalError(err instanceof Error ? err.message : '建立失敗')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(folder: Folder) {
    if (!window.confirm(`確定要刪除資料夾「${folder.name}」嗎？此動作無法復原。`)) return
    try {
      await deleteFolder(folder.id)
      setFolders((prev) => prev.filter((f) => f.id !== folder.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除失敗')
    }
  }

  const levelCode = set ? LEVEL_CODES[set.level_id] : undefined
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: '首頁', to: '/' },
    ...(levelCode ? [{ label: levelCode, to: `/level/${levelCode}` }] : []),
    { label: set?.name ?? '' },
  ]

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{set?.name ?? '資料集'}</h1>
        <Button onClick={openModal} disabled={loading || !set}>
          ＋ 新增資料夾
        </Button>
      </div>

      {loading && <Spinner />}

      {!loading && error && <p className="text-sm text-rose-600">{error}</p>}

      {!loading && !error && folders.length === 0 && (
        <EmptyState icon="🗂️" message="還沒有資料夾，點右上角「＋ 新增資料夾」開始建立吧" />
      )}

      {!loading && !error && folders.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map((folder) => {
            const count = counts[folder.id] ?? 0
            return (
              <div
                key={folder.id}
                onClick={() => navigate(`/folders/${folder.id}`)}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium text-slate-800">{folder.name}</h2>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(folder)
                    }}
                    aria-label="刪除資料夾"
                    className="shrink-0 rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                  >
                    ✕
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {count} / {FOLDER_CAPACITY} 詞
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${Math.min(100, (count / FOLDER_CAPACITY) * 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} title="新增資料夾" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <TextInput
            label="資料夾名稱"
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
