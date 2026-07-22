// 共用麵包屑：LevelPage／StudySetPage 使用。最後一項不給 to，顯示為當前頁。
import { Link } from 'react-router-dom'

export interface BreadcrumbItem {
  label: string
  to?: string
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-slate-500">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          {item.to ? (
            <Link to={item.to} className="hover:text-indigo-600 hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-slate-700">{item.label}</span>
          )}
          {index < items.length - 1 && <span className="text-slate-300">›</span>}
        </span>
      ))}
    </nav>
  )
}
