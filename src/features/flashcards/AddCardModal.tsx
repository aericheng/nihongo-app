// 新增／編輯詞卡共用 Modal：中文 → AI 自動翻譯（可微調）→ 儲存
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import * as api from '../../lib/api'
import { FOLDER_CAPACITY } from '../../lib/types'
import type { CardWithProgress } from '../../lib/types'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { TextInput } from '../../components/ui/TextInput'

interface Props {
  open: boolean
  onClose: () => void
  folderId: string
  /** 目前資料夾內的詞卡數，用於新增時的 position 與 50 詞上限判斷 */
  cardCount: number
  /** null = 新增模式；非 null = 編輯該張詞卡 */
  editingCard: CardWithProgress | null
  /** 儲存成功後呼叫，讓外層重新載入列表 */
  onSaved: () => void
}

export function AddCardModal({ open, onClose, folderId, cardCount, editingCard, onSaved }: Props) {
  const [chinese, setChinese] = useState('')
  const [japanese, setJapanese] = useState('')
  const [kana, setKana] = useState('')
  const [notes, setNotes] = useState('')

  const [translating, setTranslating] = useState(false)
  const [translateError, setTranslateError] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const isEdit = editingCard !== null
  const atCapacity = !isEdit && cardCount >= FOLDER_CAPACITY

  // Modal 每次開啟（或切換新增/編輯對象）時重置表單狀態
  useEffect(() => {
    if (!open) return
    setChinese(editingCard?.chinese ?? '')
    setJapanese(editingCard?.japanese ?? '')
    setKana(editingCard?.kana ?? '')
    setNotes(editingCard?.notes ?? '')
    setTranslateError(null)
    setSaveError(null)
    setSuccessMessage(null)
  }, [open, editingCard])

  async function handleTranslate() {
    if (!chinese.trim()) return
    setTranslating(true)
    setTranslateError(null)
    try {
      const result = await api.translateChinese(chinese.trim())
      setJapanese(result.japanese)
      setKana(result.kana)
      setNotes(result.notes)
    } catch (err) {
      setTranslateError(err instanceof Error ? err.message : 'AI 翻譯失敗')
    } finally {
      setTranslating(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!chinese.trim() || !japanese.trim() || atCapacity) return
    setSaving(true)
    setSaveError(null)
    setSuccessMessage(null)
    try {
      if (editingCard) {
        await api.updateCard(editingCard.id, {
          japanese: japanese.trim(),
          kana: kana.trim(),
          chinese: chinese.trim(),
          notes: notes.trim(),
        })
        onSaved()
        onClose()
      } else {
        const saved = await api.createCard(
          folderId,
          { japanese: japanese.trim(), kana: kana.trim(), chinese: chinese.trim(), notes: notes.trim() },
          cardCount,
        )
        onSaved()
        setSuccessMessage(`已新增「${saved.japanese}」`)
        setChinese('')
        setJapanese('')
        setKana('')
        setNotes('')
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title={isEdit ? '編輯詞卡' : '新增詞卡'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {successMessage && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">{successMessage}</p>
        )}

        <TextInput
          label="中文（必填）"
          value={chinese}
          onChange={(e) => setChinese(e.target.value)}
          required
        />

        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleTranslate}
            disabled={!chinese.trim() || translating}
          >
            {translating ? '翻譯中…' : '🤖 AI 自動翻譯'}
          </Button>
          {translateError && <p className="mt-1 text-sm text-rose-600">{translateError}</p>}
        </div>

        <TextInput
          label="日文（必填）"
          value={japanese}
          onChange={(e) => setJapanese(e.target.value)}
          className="font-jp"
          required
        />

        <TextInput label="假名" value={kana} onChange={(e) => setKana(e.target.value)} className="font-jp" />

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">解析/備註</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </label>

        {saveError && <p className="text-sm text-rose-600">{saveError}</p>}
        {atCapacity && <p className="text-sm text-amber-600">此資料夾已滿 50 詞，請回上一層新增資料夾</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {isEdit ? '取消' : '關閉'}
          </Button>
          <Button type="submit" disabled={saving || !chinese.trim() || !japanese.trim() || atCapacity}>
            {saving ? '儲存中…' : '儲存'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
