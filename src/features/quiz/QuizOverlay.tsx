// 測驗流程共用的全螢幕覆蓋層外殼（設定 Modal 以外的畫面：出題／結果頁都套這層）。
// 刻意不做「點背景關閉」——測驗中誤觸背景關閉會弄丟進度，只留右上角 × 與畫面內按鈕可關閉。
import type { ReactNode } from 'react'

interface Props {
  header: ReactNode
  children: ReactNode
  onClose: () => void
  /** 右下角小紅字警告（例如 API 失敗），不中斷流程 */
  cornerWarning?: ReactNode
}

export function QuizOverlay({ header, children, onClose, cornerWarning }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start gap-4 border-b border-slate-100 px-6 py-4">
          <div className="flex-1">{header}</div>
          <button
            onClick={onClose}
            aria-label="關閉測驗"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {cornerWarning && (
          <div className="absolute bottom-3 right-3 z-10 max-w-xs rounded-md bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 shadow">
            {cornerWarning}
          </div>
        )}
      </div>
    </div>
  )
}
