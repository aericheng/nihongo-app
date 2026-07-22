// 第四層：詞庫與學習區。單字卡列表 + 新增/編輯詞卡 Modal + 測驗入口（QuizLauncher 契約元件）。
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../lib/api'
import { FOLDER_CAPACITY } from '../lib/types'
import type { CardWithProgress, Folder, StudySet } from '../lib/types'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { QuizLauncher } from '../features/quiz/QuizLauncher'
import { CardRow } from '../features/flashcards/CardRow'
import { AddCardModal } from '../features/flashcards/AddCardModal'
import { ImportModal } from '../features/flashcards/ImportModal'

/** study_sets.level_id → 顯示用的級別代碼（對應 levels 表的 N1~N5） */
const LEVEL_CODE_MAP: Record<number, string> = { 1: 'N1', 2: 'N2', 3: 'N3', 4: 'N4', 5: 'N5' }

export function FolderPage() {
  const { folderId } = useParams<{ folderId: string }>()

  const [folder, setFolder] = useState<Folder | null>(null)
  const [studySet, setStudySet] = useState<StudySet | null>(null)
  const [cards, setCards] = useState<CardWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<CardWithProgress | null>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)

  const reloadCards = useCallback(async () => {
    if (!folderId) return
    try {
      const list = await api.listCards(folderId)
      setCards(list)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '讀取單字失敗')
    }
  }, [folderId])

  useEffect(() => {
    if (!folderId) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const f = await api.getFolder(folderId!)
        const s = await api.getStudySet(f.study_set_id)
        const list = await api.listCards(folderId!)
        if (cancelled) return
        setFolder(f)
        setStudySet(s)
        setCards(list)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '讀取資料夾失敗')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [folderId])

  function openCreateModal() {
    setEditingCard(null)
    setModalOpen(true)
  }

  function openEditModal(card: CardWithProgress) {
    setEditingCard(card)
    setModalOpen(true)
  }

  async function handleToggleStar(card: CardWithProgress) {
    try {
      await api.toggleStar(card.id, !card.starred)
      await reloadCards()
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新星星失敗')
    }
  }

  async function handleDelete(card: CardWithProgress) {
    if (!window.confirm(`確定要刪除「${card.japanese}」嗎？`)) return
    try {
      await api.deleteCard(card.id)
      await reloadCards()
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除單字失敗')
    }
  }

  if (loading) return <Spinner label="載入詞庫中…" />
  if (!folder || !studySet) {
    return <p className="text-sm text-rose-600">{error ?? '找不到這個資料夾'}</p>
  }

  const levelCode = LEVEL_CODE_MAP[studySet.level_id]
  const atCapacity = cards.length >= FOLDER_CAPACITY

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        <Link to="/" className="hover:text-indigo-600">
          首頁
        </Link>
        <span>›</span>
        {levelCode ? (
          <Link to={`/level/${levelCode}`} className="hover:text-indigo-600">
            {levelCode}
          </Link>
        ) : (
          <span>{studySet.level_id}</span>
        )}
        <span>›</span>
        <Link to={`/sets/${studySet.id}`} className="hover:text-indigo-600">
          {studySet.name}
        </Link>
        <span>›</span>
        <span className="font-medium text-slate-700">{folder.name}</span>
      </nav>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{folder.name}</h1>
          <p className="text-sm text-slate-400">
            {cards.length} / {FOLDER_CAPACITY}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <QuizLauncher folderId={folder.id} cards={cards} onProgressChanged={reloadCards} />
          <Button variant="secondary" onClick={() => setImportModalOpen(true)}>
            📥 批次匯入
          </Button>
          <div className="flex flex-col items-end">
            <Button onClick={openCreateModal} disabled={atCapacity}>
              ＋ 新增詞卡
            </Button>
            {atCapacity && (
              <span className="mt-1 max-w-[16rem] text-right text-xs text-amber-600">
                此資料夾已滿 50 詞，請回上一層新增資料夾
              </span>
            )}
          </div>
        </div>
      </div>

      {cards.length === 0 ? (
        <EmptyState
          message="這個資料夾還沒有單字，新增第一張詞卡開始學習吧"
          action={<Button onClick={openCreateModal}>新增第一張詞卡</Button>}
        />
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              onToggleStar={() => handleToggleStar(card)}
              onEdit={() => openEditModal(card)}
              onDelete={() => handleDelete(card)}
            />
          ))}
        </div>
      )}

      <AddCardModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        folderId={folder.id}
        cardCount={cards.length}
        editingCard={editingCard}
        onSaved={reloadCards}
      />

      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        folderId={folder.id}
        currentCount={cards.length}
        onImported={reloadCards}
      />
    </div>
  )
}
