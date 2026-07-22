import { useNavigate } from 'react-router-dom'

interface LevelCard {
  id: number
  code: string
  title: string
  desc: string
  gradient: string
}

// 級別為靜態資料，與 DB seed 一致：N1 id=1 … N5 id=5。難度由易到難排序，配色由綠到紅漸進。
const LEVELS: LevelCard[] = [
  { id: 5, code: 'N5', title: '入門', desc: '基礎單字，剛開始學日文', gradient: 'from-emerald-400 to-emerald-600' },
  { id: 4, code: 'N4', title: '初級', desc: '生活常用單字', gradient: 'from-teal-400 to-teal-600' },
  { id: 3, code: 'N3', title: '中級', desc: '銜接日常會話與新聞內容', gradient: 'from-amber-400 to-amber-600' },
  { id: 2, code: 'N2', title: '中高級', desc: '較複雜的文章與會話', gradient: 'from-orange-400 to-orange-600' },
  { id: 1, code: 'N1', title: '高級', desc: '接近母語者程度', gradient: 'from-rose-400 to-rose-600' },
]

export function HomePage() {
  const navigate = useNavigate()

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-800">選擇級別</h1>
      <p className="mb-6 text-sm text-slate-500">依 JLPT 級別選擇要學習的單字資料集</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LEVELS.map((level) => (
          <button
            key={level.id}
            type="button"
            onClick={() => navigate(`/level/${level.code}`)}
            className={`flex flex-col items-start gap-2 rounded-2xl bg-gradient-to-br p-6 text-left text-white shadow-md transition-transform hover:scale-[1.02] hover:shadow-lg ${level.gradient}`}
          >
            <span className="text-3xl font-bold">{level.code}</span>
            <span className="text-lg font-medium">{level.title}</span>
            <span className="text-sm text-white/80">{level.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
