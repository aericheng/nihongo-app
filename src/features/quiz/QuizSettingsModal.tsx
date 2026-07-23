// 測驗設定 Modal：題型 / 翻譯方向 / 題目範圍 三組 segmented 選項 + 開始測驗。
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { CardWithProgress, Direction, QuestionType, QuizConfig, QuizScope } from '../../lib/types'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'

interface Props {
  open: boolean
  cards: CardWithProgress[]
  onClose: () => void
  onStart: (config: QuizConfig) => void
}

function SegButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300 ${
        active
          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
          : 'border-slate-300 text-slate-600 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  )
}

export function QuizSettingsModal({ open, cards, onClose, onStart }: Props) {
  const choiceDisabled = cards.length < 4
  const starredCount = cards.filter((c) => c.starred).length
  const scopeStarredDisabled = starredCount === 0

  const [questionType, setQuestionType] = useState<QuestionType>('choice')
  const [direction, setDirection] = useState<Direction>('jp2zh')
  const [scope, setScope] = useState<QuizScope>('all')

  // 每次重新開啟設定 Modal 時回到安全的預設值（避免殘留上一輪不可用的選項）
  useEffect(() => {
    if (!open) return
    setQuestionType(cards.length < 4 ? 'typing' : 'choice')
    setDirection('jp2zh')
    setScope('all')
  }, [open, cards.length])

  const canStart = !(questionType === 'choice' && choiceDisabled) && !(scope === 'starred' && scopeStarredDisabled)

  function handleStart() {
    if (!canStart) return
    onStart({ questionType, direction, scope })
  }

  return (
    <Modal open={open} title="設定測驗" onClose={onClose}>
      <div className="space-y-5">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">題型</h3>
          <div className="flex gap-2">
            <SegButton
              active={questionType === 'choice'}
              disabled={choiceDisabled}
              onClick={() => setQuestionType('choice')}
            >
              四選一選擇題
            </SegButton>
            <SegButton active={questionType === 'typing'} onClick={() => setQuestionType('typing')}>
              文字拼寫輸入題
            </SegButton>
          </div>
          {choiceDisabled && <p className="mt-1 text-xs text-rose-500">需要至少 4 張單字卡才能出選擇題</p>}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">翻譯方向</h3>
          <div className="flex gap-2">
            <SegButton active={direction === 'jp2zh'} onClick={() => setDirection('jp2zh')}>
              日 → 中
            </SegButton>
            <SegButton active={direction === 'zh2jp'} onClick={() => setDirection('zh2jp')}>
              中 → 日
            </SegButton>
          </div>
          {questionType === 'typing' && (
            <p className="mt-1 text-xs text-slate-400">中 → 日：50 音鍵盤拼假名；日 → 中：中文字塊拼意思</p>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">題目範圍</h3>
          <div className="flex gap-2">
            <SegButton active={scope === 'all'} onClick={() => setScope('all')}>
              全部單字（{cards.length} 張）
            </SegButton>
            <SegButton active={scope === 'starred'} disabled={scopeStarredDisabled} onClick={() => setScope('starred')}>
              僅測驗星星錯題（{starredCount} 張）
            </SegButton>
          </div>
        </section>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleStart} disabled={!canStart}>
            開始測驗
          </Button>
        </div>
      </div>
    </Modal>
  )
}
