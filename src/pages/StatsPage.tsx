// 學習統計頁：彙整全部資料集的學習成果（統計磚／每日學習量／答對率趨勢／資料集掌握度／最常錯單字）
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { listAllCardsLite, listAllProgress, listAllQuizSessions } from '../lib/api'
import type { CardLite, ProgressRow, QuizSessionRow } from '../lib/api'
import { Spinner } from '../components/ui/Spinner'
import {
  computeAccuracyTrend,
  computeDailyActivity,
  computeSetMastery,
  computeStatTiles,
  computeTopWrong,
} from '../features/stats/aggregate'
import { StatTiles } from '../features/stats/StatTiles'
import { DailyActivityChart } from '../features/stats/DailyActivityChart'
import { AccuracyTrendChart } from '../features/stats/AccuracyTrendChart'
import { SetMasteryList } from '../features/stats/SetMasteryList'
import { TopWrongList } from '../features/stats/TopWrongList'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-slate-800">{title}</h2>
      {children}
    </section>
  )
}

export function StatsPage() {
  const [progress, setProgress] = useState<ProgressRow[]>([])
  const [sessions, setSessions] = useState<QuizSessionRow[]>([])
  const [cards, setCards] = useState<CardLite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [p, s, c] = await Promise.all([listAllProgress(), listAllQuizSessions(), listAllCardsLite()])
        if (cancelled) return
        setProgress(p)
        setSessions(s)
        setCards(c)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '讀取統計資料失敗')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const tiles = useMemo(() => computeStatTiles(cards, progress, sessions), [cards, progress, sessions])
  const dailyActivity = useMemo(() => computeDailyActivity(sessions), [sessions])
  const accuracyTrend = useMemo(() => computeAccuracyTrend(sessions), [sessions])
  const setMastery = useMemo(() => computeSetMastery(cards, progress), [cards, progress])
  const topWrong = useMemo(() => computeTopWrong(cards, progress), [cards, progress])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">學習統計</h1>
        <p className="mt-1 text-sm text-slate-500">回顧你的學習成果，掌握還需要加強的地方</p>
      </div>

      {loading && <Spinner label="載入統計中…" />}

      {!loading && error && <p className="text-sm text-rose-600">{error}</p>}

      {!loading && !error && (
        <>
          <StatTiles tiles={tiles} />

          <Section title="近 14 天學習量">
            <DailyActivityChart points={dailyActivity} />
          </Section>

          <Section title="答對率趨勢">
            <AccuracyTrendChart points={accuracyTrend} />
          </Section>

          <Section title="各資料集掌握度">
            <SetMasteryList groups={setMastery} />
          </Section>

          <Section title="最常錯的單字 Top 10">
            <TopWrongList items={topWrong} />
          </Section>
        </>
      )}
    </div>
  )
}
