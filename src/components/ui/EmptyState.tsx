import type { ReactNode } from 'react'

export function EmptyState({ icon = '📂', message, action }: { icon?: string; message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-14 text-slate-400">
      <span className="text-4xl">{icon}</span>
      <p className="text-sm">{message}</p>
      {action}
    </div>
  )
}
