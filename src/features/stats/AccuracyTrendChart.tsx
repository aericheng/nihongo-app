// 答對率趨勢：最近 15 場測驗各一根長條，Y 軸 0–100%，只直接標最新一場的百分比
import { EmptyState } from '../../components/ui/EmptyState'
import type { AccuracyTrendPoint } from './aggregate'

const CHART_HEIGHT = 128 // px，繪圖區高度

export function AccuracyTrendChart({ points }: { points: AccuracyTrendPoint[] }) {
  if (points.length === 0) {
    return <EmptyState icon="🎯" message="還沒有測驗紀錄，完成第一場測驗後這裡會顯示答對率趨勢" />
  }

  const lastIndex = points.length - 1

  return (
    <div className="overflow-x-auto">
      <p className="mb-2 text-xs text-slate-400">近 {points.length} 場測驗</p>
      <div className="flex gap-2">
        {/* Y 軸刻度：0 / 50 / 100% */}
        <div className="relative shrink-0 text-[10px] text-slate-400" style={{ height: CHART_HEIGHT, width: 26 }}>
          <span className="absolute right-0 top-0 -translate-y-1/2">100%</span>
          <span className="absolute right-0 top-1/2 -translate-y-1/2">50%</span>
          <span className="absolute right-0 bottom-0 translate-y-1/2">0%</span>
        </div>

        <div className="relative min-w-0 flex-1" style={{ height: CHART_HEIGHT }}>
          {/* 格線：極淡 slate hairline */}
          <div className="absolute inset-x-0 top-0 border-t border-slate-100" />
          <div className="absolute inset-x-0 top-1/2 border-t border-slate-100" />
          <div className="absolute inset-x-0 bottom-0 border-t border-slate-200" />

          {/* 長條 */}
          <div className="absolute inset-0 flex items-end justify-between gap-[2px] px-1">
            {points.map((p, i) => {
              const isLast = i === lastIndex
              return (
                <div key={p.id} className="flex h-full flex-1 flex-col items-center justify-end">
                  {isLast && <span className="mb-1 text-[10px] font-medium text-slate-500">{p.pct}%</span>}
                  {p.pct > 0 ? (
                    <div
                      title={`${p.dateLabel}：${p.correct}/${p.total} 題（${p.pct}%）`}
                      className="w-full max-w-[18px] rounded-t-[4px] bg-indigo-600"
                      style={{ height: `${p.pct}%` }}
                    />
                  ) : (
                    <div
                      title={`${p.dateLabel}：${p.correct}/${p.total} 題（0%）`}
                      className="h-1 w-1 rounded-full bg-slate-300"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
