// 批次匯入詞卡 Modal：貼上多行文字，一次解析並建立多張詞卡
import { useEffect, useMemo, useRef, useState } from 'react'
import * as api from '../../lib/api'
import { FOLDER_CAPACITY } from '../../lib/types'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'

interface Props {
  open: boolean
  onClose: () => void
  folderId: string
  /** 目前資料夾內的詞卡數，用於計算剩餘容量與新卡 position */
  currentCount: number
  /** 匯入成功後呼叫，讓外層重新載入列表 */
  onImported: () => void
}

interface ParsedRow {
  chinese: string
  japanese: string
  kana: string
  notes: string
}

interface ParseResult {
  rows: ParsedRow[]
  /** 湊不出中文與日文兩個必填欄位而略過的行數（空行不計入） */
  skipped: number
}

/** 分隔符同時支援半形逗號、全形逗號（，）、Tab */
const SPLIT_REGEX = /[,，\t]/

/**
 * 純函式：解析批次匯入文字。
 * 每行格式「中文,日文,假名[,解析/備註]」，假名與備註皆可省略。
 * 空行直接略過（不計入 skipped）；缺中文或日文的行計入 skipped。
 */
export function parseImportText(text: string): ParseResult {
  const lines = text.split(/\r\n|\r|\n/)
  const rows: ParsedRow[] = []
  let skipped = 0
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    const parts = line.split(SPLIT_REGEX).map((p) => p.trim())
    const chinese = parts[0] ?? ''
    const japanese = parts[1] ?? ''
    const kana = parts[2] ?? ''
    const notes = parts[3] ?? ''
    if (!chinese || !japanese) {
      skipped += 1
      continue
    }
    rows.push({ chinese, japanese, kana, notes })
  }
  return { rows, skipped }
}

export function ImportModal({ open, onClose, folderId, currentCount, onImported }: Props) {
  const [text, setText] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const closeTimeoutRef = useRef<number | null>(null)

  // Modal 每次開啟時重置表單狀態
  useEffect(() => {
    if (!open) return
    setText('')
    setImportError(null)
    setSuccessMessage(null)
  }, [open])

  // 元件卸載時清掉尚未觸發的自動關閉計時器
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) window.clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  const parsed = useMemo(() => parseImportText(text), [text])
  const remaining = Math.max(0, FOLDER_CAPACITY - currentCount)
  const overCapacity = parsed.rows.length > remaining
  const importCount = Math.min(parsed.rows.length, remaining)

  async function handleImport() {
    if (importCount === 0 || importing) return
    setImporting(true)
    setImportError(null)
    setSuccessMessage(null)
    try {
      const toImport = parsed.rows.slice(0, importCount)
      await api.createCardsBulk(
        folderId,
        toImport.map(({ chinese, japanese, kana, notes }) => ({ japanese, kana, chinese, notes })),
        currentCount,
      )
      onImported()
      setSuccessMessage(`已匯入 ${toImport.length} 張`)
      closeTimeoutRef.current = window.setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : '批次匯入失敗')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Modal open={open} title="批次匯入詞卡" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          每行一張卡，格式「中文,日文,假名」（假名可省略；也接受第 4 欄作為解析/備註）。分隔符可用半形逗號、全形逗號（，）或
          Tab。
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={9}
          placeholder={'例：\n吃飯,ご飯を食べる,ごはんをたべる\n謝謝,ありがとう'}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base font-jp focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />

        <p className="text-sm text-slate-500">
          可匯入 {parsed.rows.length} 張／略過 {parsed.skipped} 行（格式不完整）
        </p>
        {overCapacity && <p className="text-sm text-rose-600">超過資料夾上限，僅會匯入前 {remaining} 張</p>}

        {successMessage && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">{successMessage}</p>
        )}
        {importError && <p className="text-sm text-rose-600">{importError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="button" onClick={handleImport} disabled={importing || importCount === 0}>
            {importing ? '匯入中…' : '匯入'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
