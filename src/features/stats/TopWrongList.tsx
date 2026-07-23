// 最常錯的單字 Top 10：假名優先顯示，右側 rose 色錯誤次數 badge
import { EmptyState } from '../../components/ui/EmptyState'
import type { TopWrongCard } from './aggregate'

export function TopWrongList({ items }: { items: TopWrongCard[] }) {
  if (items.length === 0) {
    return <EmptyState icon="🎉" message="目前沒有常錯的單字，繼續保持下去！" />
  }

  return (
    <div className="space-y-2">
      {items.map((card) => (
        <div
          key={card.id}
          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
        >
          <div className="min-w-0">
            <p className="font-jp text-lg font-bold text-slate-900">{card.kana || card.japanese}</p>
            <p className="text-sm text-slate-600">{card.chinese}</p>
          </div>
          <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">
            錯 {card.wrongCount} 次
          </span>
        </div>
      ))}
    </div>
  )
}
