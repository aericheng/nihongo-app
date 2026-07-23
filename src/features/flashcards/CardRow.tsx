// 詞庫列表單一列：星星／日文＋假名／中文／備註／編輯／刪除
import { Button } from '../../components/ui/Button'
import type { CardWithProgress } from '../../lib/types'

interface Props {
  card: CardWithProgress
  onToggleStar: () => void
  onEdit: () => void
  onDelete: () => void
}

export function CardRow({ card, onToggleStar, onEdit, onDelete }: Props) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={onToggleStar}
        aria-label={card.starred ? '取消標記星號' : '標記星號'}
        className="shrink-0 text-2xl leading-none"
      >
        {card.starred ? <span className="text-amber-400">★</span> : <span className="text-slate-300">☆</span>}
      </button>

      <div className="min-w-0 flex-1">
        {/* 主顯示為假名（初學者可直接讀）；沒有假名的卡片退回顯示日文原文 */}
        <p className="font-jp text-xl font-bold text-slate-900">{card.kana || card.japanese}</p>
        <p className="text-sm text-slate-600">{card.chinese}</p>
        {card.notes && <p className="mt-0.5 text-xs text-slate-400">{card.notes}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button variant="ghost" onClick={onEdit}>
          編輯
        </Button>
        <Button variant="danger" onClick={onDelete}>
          刪除
        </Button>
      </div>
    </div>
  )
}
