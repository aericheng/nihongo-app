// 統計磚一列：總單字數／已測驗過／錯題數／整體答對率
import type { StatTiles as StatTilesData } from './aggregate'

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-3xl font-bold text-slate-800">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  )
}

export function StatTiles({ tiles }: { tiles: StatTilesData }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Tile label="總單字數" value={String(tiles.totalCards)} />
      <Tile label="已測驗過" value={String(tiles.testedCards)} />
      <Tile label="錯題數" value={String(tiles.wrongCards)} />
      <Tile label="整體答對率" value={tiles.accuracyPct === null ? '—' : `${tiles.accuracyPct}%`} />
    </div>
  )
}
