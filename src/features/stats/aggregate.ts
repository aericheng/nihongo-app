// 學習統計頁的純聚合函式。全部不呼叫 API、不含副作用，方便單獨驗證。
// 輸入一律是 lib/api.ts 匯出的三個 fetcher 之回傳型別。
import type { CardLite, ProgressRow, QuizSessionRow } from '../../lib/api'

/** study_sets.level_id → 顯示用的級別代碼，與 FolderPage/StudySetPage 的對照表一致 */
export const LEVEL_CODE_MAP: Record<number, string> = { 1: 'N1', 2: 'N2', 3: 'N3', 4: 'N4', 5: 'N5' }

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 一個 Date 在「本地時區」的日期鍵，格式 YYYY-MM-DD（同一天不論時分秒一律同鍵） */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** 本地時區的 MM/DD 顯示用標籤 */
export function localMonthDay(d: Date): string {
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`
}

// ---------- 1. 統計磚 ----------

export interface StatTiles {
  totalCards: number
  testedCards: number
  wrongCards: number
  /** 0-100 整數；完全沒測驗過時為 null（畫面顯示「—」） */
  accuracyPct: number | null
}

export function computeStatTiles(
  cards: CardLite[],
  progress: ProgressRow[],
  sessions: QuizSessionRow[],
): StatTiles {
  const totalCards = cards.length
  const testedCards = progress.filter((p) => p.correct_count + p.wrong_count > 0).length
  const wrongCards = progress.filter((p) => p.starred).length

  let sumCorrect = 0
  let sumTotal = 0
  for (const s of sessions) {
    sumCorrect += s.correct_count
    sumTotal += s.total_questions
  }
  const accuracyPct = sumTotal > 0 ? Math.round((sumCorrect / sumTotal) * 100) : null

  return { totalCards, testedCards, wrongCards, accuracyPct }
}

// ---------- 2. 近 14 天學習量 ----------

export interface DailyActivityPoint {
  dateKey: string
  label: string // MM/DD
  count: number
  isToday: boolean
}

/**
 * 依 session.created_at 的本地日期分組加總 total_questions，補滿最近 days 天（含今天）。
 * referenceDate 預設為呼叫當下，可在測試時傳入固定值。
 */
export function computeDailyActivity(
  sessions: QuizSessionRow[],
  referenceDate: Date = new Date(),
  days = 14,
): DailyActivityPoint[] {
  const totals = new Map<string, number>()
  for (const s of sessions) {
    const key = localDateKey(new Date(s.created_at))
    totals.set(key, (totals.get(key) ?? 0) + s.total_questions)
  }

  const todayKey = localDateKey(referenceDate)
  const points: DailyActivityPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(referenceDate)
    d.setDate(d.getDate() - i)
    const key = localDateKey(d)
    points.push({
      dateKey: key,
      label: localMonthDay(d),
      count: totals.get(key) ?? 0,
      isToday: key === todayKey,
    })
  }
  return points
}

// ---------- 3. 答對率趨勢 ----------

export interface AccuracyTrendPoint {
  id: string
  dateLabel: string // MM/DD
  correct: number
  total: number
  /** 0-100 整數 */
  pct: number
}

/** 取最近 limit 場測驗（sessions 依 listAllQuizSessions 的約定為舊到新） */
export function computeAccuracyTrend(sessions: QuizSessionRow[], limit = 15): AccuracyTrendPoint[] {
  const recent = sessions.slice(Math.max(0, sessions.length - limit))
  return recent.map((s) => ({
    id: s.id,
    dateLabel: localMonthDay(new Date(s.created_at)),
    correct: s.correct_count,
    total: s.total_questions,
    pct: s.total_questions > 0 ? Math.round((s.correct_count / s.total_questions) * 100) : 0,
  }))
}

// ---------- 4. 各資料集掌握度 ----------

export interface SetMastery {
  /** listAllCardsLite 沒有回傳 study_set id，只能以「級別+名稱」當分組鍵 */
  key: string
  levelId: number
  levelCode: string
  name: string
  totalCards: number
  testedCards: number
  wrongCount: number
}

export function computeSetMastery(cards: CardLite[], progress: ProgressRow[]): SetMastery[] {
  const progressMap = new Map(progress.map((p) => [p.flashcard_id, p]))
  const groups = new Map<string, SetMastery>()

  for (const card of cards) {
    const key = `${card.level_id}::${card.set_name}`
    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        levelId: card.level_id,
        levelCode: LEVEL_CODE_MAP[card.level_id] ?? '',
        name: card.set_name,
        totalCards: 0,
        testedCards: 0,
        wrongCount: 0,
      }
      groups.set(key, group)
    }
    group.totalCards += 1
    const p = progressMap.get(card.id)
    if (p && p.correct_count + p.wrong_count > 0) group.testedCards += 1
    if (p?.starred) group.wrongCount += 1
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.levelId !== b.levelId) return a.levelId - b.levelId
    return a.name.localeCompare(b.name, 'zh-Hant')
  })
}

// ---------- 5. 最常錯的單字 Top 10 ----------

export interface TopWrongCard {
  id: string
  kana: string
  japanese: string
  chinese: string
  wrongCount: number
}

export function computeTopWrong(cards: CardLite[], progress: ProgressRow[], limit = 10): TopWrongCard[] {
  const progressMap = new Map(progress.map((p) => [p.flashcard_id, p]))
  const withWrong: TopWrongCard[] = []

  for (const card of cards) {
    const p = progressMap.get(card.id)
    if (p && p.wrong_count > 0) {
      withWrong.push({
        id: card.id,
        kana: card.kana,
        japanese: card.japanese,
        chinese: card.chinese,
        wrongCount: p.wrong_count,
      })
    }
  }

  withWrong.sort((a, b) => b.wrongCount - a.wrongCount)
  return withWrong.slice(0, limit)
}
