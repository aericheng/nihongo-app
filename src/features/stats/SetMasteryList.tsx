// 各資料集掌握度：名稱＋級別、已測過/總卡數、indigo 進度條、右側錯題數
import { EmptyState } from '../../components/ui/EmptyState'
import type { SetMastery } from './aggregate'

export function SetMasteryList({ groups }: { groups: SetMastery[] }) {
  if (groups.length === 0) {
    return <EmptyState icon="🗂️" message="還沒有任何資料集，先去新增單字開始學習吧" />
  }

  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const pct = g.totalCards > 0 ? Math.min(100, (g.testedCards / g.totalCards) * 100) : 0
        return (
          <div key={g.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">
                  {g.name}
                  {g.levelCode && <span className="ml-1 text-xs font-normal text-slate-400">{g.levelCode}</span>}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {g.testedCards} / {g.totalCards} 已測驗
                </p>
              </div>
              <span className="shrink-0 text-xs text-slate-500">⭐ {g.wrongCount}</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
