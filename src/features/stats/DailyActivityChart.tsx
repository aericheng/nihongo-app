// 近 14 天學習量：單色 indigo 長條圖，X 軸只標頭尾（尾即今天）
import { EmptyState } from '../../components/ui/EmptyState'
import type { DailyActivityPoint } from './aggregate'

const CHART_HEIGHT = 128 // px，繪圖區高度

export function DailyActivityChart({ points }: { points: DailyActivityPoint[] }) {
  const max = Math.max(0, ...points.map((p) => p.count))

  if (points.length === 0 || max === 0) {
    return <EmptyState icon="📊" message="最近 14 天還沒有測驗紀錄，開始測驗後這裡會顯示每天的答題量" />
  }

  let maxIndex = 0
  points.forEach((p, i) => {
    if (p.count > points[maxIndex].count) maxIndex = i
  })
  const lastIndex = points.length - 1

  return (
    <div className="overflow-x-auto">
      <div className="relative" style={{ height: CHART_HEIGHT }}>
        {/* 格線：極淡 slate，25/50/75% 為 hairline，基線稍深 */}
        <div className="absolute inset-x-0 top-1/4 border-t border-slate-100" />
        <div className="absolute inset-x-0 top-1/2 border-t border-slate-100" />
        <div className="absolute inset-x-0 top-3/4 border-t border-slate-100" />
        <div className="absolute inset-x-0 bottom-0 border-t border-slate-200" />

        {/* 長條 */}
        <div className="absolute inset-0 flex items-end justify-between gap-[2px] px-1">
          {points.map((p, i) => {
            const pct = (p.count / max) * 100
            const showLabel = i === maxIndex || i === lastIndex
            return (
              <div key={p.dateKey} className="flex h-full flex-1 flex-col items-center justify-end">
                {showLabel && <span className="mb-1 text-[10px] font-medium text-slate-500">{p.count}</span>}
                {p.count > 0 ? (
                  <div
                    title={`${p.label}：${p.count} 題`}
                    className="w-full max-w-[18px] rounded-t-[4px] bg-indigo-600"
                    style={{ height: `${pct}%` }}
                  />
                ) : (
                  <div title={`${p.label}：0 題`} className="h-1 w-1 rounded-full bg-slate-300" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* X 軸：只標頭尾（尾即今天），避免擁擠 */}
      <div className="mt-1 flex justify-between px-1 text-xs text-slate-400">
        <span>{points[0].label}</span>
        <span className="font-medium text-slate-500">{points[lastIndex].label}（今天）</span>
      </div>
    </div>
  )
}
