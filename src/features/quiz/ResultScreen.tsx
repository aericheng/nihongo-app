// 測驗結果頁：顯示答對率、鼓勵語、錯題列表，並把這次測驗結果存進 DB。
import { useEffect, useRef, useState } from 'react'
import type { CardWithProgress, QuizConfig } from '../../lib/types'
import { saveQuizSession } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { QuizOverlay } from './QuizOverlay'
import { encouragement } from './logic'

interface Props {
  folderId: string
  config: QuizConfig
  total: number
  correct: number
  wrongCards: CardWithProgress[]
  onRetry: () => void
  onClose: () => void
}

export function ResultScreen({ folderId, config, total, correct, wrongCards, onRetry, onClose }: Props) {
  const [saveWarning, setSaveWarning] = useState<string | null>(null)
  // StrictMode 開發模式會把 mount effect 執行兩次，用 ref 防止測驗紀錄重複寫入
  const savedRef = useRef(false)

  useEffect(() => {
    if (savedRef.current) return
    savedRef.current = true
    saveQuizSession(folderId, config, total, correct).catch((err: unknown) => {
      setSaveWarning(err instanceof Error ? err.message : '儲存測驗紀錄失敗')
    })
    // 結果頁掛載時儲存一次即可，不需要隨 props 變動重跑
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <QuizOverlay
      onClose={onClose}
      header={<p className="text-sm font-semibold text-slate-700">測驗結果</p>}
      cornerWarning={saveWarning ? `⚠ ${saveWarning}` : undefined}
    >
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <p className="text-4xl font-extrabold text-indigo-600">
          {correct} / {total}
        </p>
        <p className="text-base font-medium text-slate-600">{encouragement(correct, total)}</p>
      </div>

      {wrongCards.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">答錯的單字（{wrongCards.length}）</h3>
          <ul className="space-y-2">
            {wrongCards.map((card) => (
              <li key={card.id} className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="font-jp text-sm font-medium text-slate-800">
                  {card.kana || card.japanese}
                  {card.kana && card.japanese !== card.kana && (
                    <span className="ml-2 text-xs font-normal text-slate-400">{card.japanese}</span>
                  )}
                </p>
                <p className="text-sm text-slate-500">{card.chinese}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onRetry}>
          再測一次
        </Button>
        <Button onClick={onClose}>完成</Button>
      </div>
    </QuizOverlay>
  )
}
