// 資料存取層：所有 Supabase 查詢集中在這裡，頁面元件一律呼叫這些函式。
// 錯誤處理約定:失敗一律 throw Error(中文訊息)，由呼叫端 catch 顯示。
import { supabase } from './supabase'
import type {
  CardWithProgress,
  Flashcard,
  Folder,
  Level,
  QuizConfig,
  StudySet,
  TranslateResult,
} from './types'

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) throw new Error('尚未登入')
  return data.session.user.id
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, action: string): T {
  if (result.error) throw new Error(`${action}失敗：${result.error.message}`)
  if (result.data === null) throw new Error(`${action}失敗：無回傳資料`)
  return result.data
}

// ---------- Levels ----------

export async function getLevelByCode(code: string): Promise<Level> {
  const res = await supabase.from('levels').select('*').eq('code', code.toUpperCase()).single()
  return unwrap(res, '讀取級別')
}

// ---------- Study Sets（第二層） ----------

export async function listStudySets(levelId: number): Promise<StudySet[]> {
  const res = await supabase
    .from('study_sets')
    .select('*')
    .eq('level_id', levelId)
    .order('created_at')
  return unwrap(res, '讀取資料集')
}

export async function createStudySet(levelId: number, name: string): Promise<StudySet> {
  const user_id = await currentUserId()
  const res = await supabase
    .from('study_sets')
    .insert({ user_id, level_id: levelId, name: name.trim() })
    .select()
    .single()
  return unwrap(res, '建立資料集')
}

export async function deleteStudySet(id: string): Promise<void> {
  const { error } = await supabase.from('study_sets').delete().eq('id', id)
  if (error) throw new Error(`刪除資料集失敗：${error.message}`)
}

export async function getStudySet(id: string): Promise<StudySet> {
  const res = await supabase.from('study_sets').select('*').eq('id', id).single()
  return unwrap(res, '讀取資料集')
}

// ---------- Folders（第三層） ----------

export async function listFolders(studySetId: string): Promise<Folder[]> {
  const res = await supabase
    .from('folders')
    .select('*')
    .eq('study_set_id', studySetId)
    .order('position')
  return unwrap(res, '讀取資料夾')
}

export async function createFolder(studySetId: string, name: string, position: number): Promise<Folder> {
  const user_id = await currentUserId()
  const res = await supabase
    .from('folders')
    .insert({ user_id, study_set_id: studySetId, name: name.trim(), position })
    .select()
    .single()
  return unwrap(res, '建立資料夾')
}

export async function renameFolder(id: string, name: string): Promise<Folder> {
  const res = await supabase
    .from('folders')
    .update({ name: name.trim() })
    .eq('id', id)
    .select()
    .single()
  return unwrap(res, '重新命名資料夾')
}

export async function deleteFolder(id: string): Promise<void> {
  const { error } = await supabase.from('folders').delete().eq('id', id)
  if (error) throw new Error(`刪除資料夾失敗：${error.message}`)
}

export async function getFolder(id: string): Promise<Folder> {
  const res = await supabase.from('folders').select('*').eq('id', id).single()
  return unwrap(res, '讀取資料夾')
}

/** 各資料夾目前的單字數（第三層顯示 x/50 用） */
export async function countCardsByFolder(studySetId: string): Promise<Record<string, number>> {
  const res = await supabase
    .from('flashcards')
    .select('folder_id, folders!inner(study_set_id)')
    .eq('folders.study_set_id', studySetId)
  const rows = unwrap(res, '統計單字數') as { folder_id: string }[]
  const counts: Record<string, number> = {}
  for (const row of rows) counts[row.folder_id] = (counts[row.folder_id] ?? 0) + 1
  return counts
}

// ---------- Flashcards（第四層） ----------

/** 讀取資料夾內所有單字卡＋本人的星星/統計（user_progress 受 RLS 保護，join 只會拿到自己的列） */
export async function listCards(folderId: string): Promise<CardWithProgress[]> {
  const res = await supabase
    .from('flashcards')
    .select('*, user_progress(starred, correct_count, wrong_count)')
    .eq('folder_id', folderId)
    .order('position')
  type Row = Flashcard & { user_progress: { starred: boolean; correct_count: number; wrong_count: number }[] }
  const rows = unwrap(res, '讀取單字') as Row[]
  return rows.map(({ user_progress, ...card }) => ({
    ...card,
    starred: user_progress[0]?.starred ?? false,
    correct_count: user_progress[0]?.correct_count ?? 0,
    wrong_count: user_progress[0]?.wrong_count ?? 0,
  }))
}

export interface NewCard {
  japanese: string
  kana: string
  chinese: string
  notes: string
}

export async function createCard(folderId: string, card: NewCard, position: number): Promise<Flashcard> {
  const user_id = await currentUserId()
  const res = await supabase
    .from('flashcards')
    .insert({
      user_id,
      folder_id: folderId,
      japanese: card.japanese.trim(),
      kana: card.kana.trim(),
      chinese: card.chinese.trim(),
      notes: card.notes.trim(),
      position,
    })
    .select()
    .single()
  return unwrap(res, '新增單字')
}

/** 批次匯入：單一次 insert 寫入多張卡，position 從 startPosition 起遞增 */
export async function createCardsBulk(folderId: string, cards: NewCard[], startPosition: number): Promise<void> {
  const user_id = await currentUserId()
  const rows = cards.map((card, index) => ({
    user_id,
    folder_id: folderId,
    japanese: card.japanese.trim(),
    kana: card.kana.trim(),
    chinese: card.chinese.trim(),
    notes: card.notes.trim(),
    position: startPosition + index,
  }))
  const { error } = await supabase.from('flashcards').insert(rows)
  if (error) throw new Error(`批次匯入失敗：${error.message}`)
}

export async function updateCard(id: string, card: Partial<NewCard>): Promise<Flashcard> {
  const res = await supabase.from('flashcards').update(card).eq('id', id).select().single()
  return unwrap(res, '更新單字')
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await supabase.from('flashcards').delete().eq('id', id)
  if (error) throw new Error(`刪除單字失敗：${error.message}`)
}

// ---------- 學習進度（星星／測驗統計） ----------

export async function toggleStar(flashcardId: string, starred: boolean): Promise<void> {
  const user_id = await currentUserId()
  const { error } = await supabase.from('user_progress').upsert(
    { user_id, flashcard_id: flashcardId, starred, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,flashcard_id' },
  )
  if (error) throw new Error(`更新星星失敗：${error.message}`)
}

/**
 * 記錄一次作答。答錯時自動加星（starred = true）；答對不會取消星星（清星星走 toggleStar）。
 */
export async function recordAnswer(flashcardId: string, correct: boolean): Promise<void> {
  const user_id = await currentUserId()
  const existing = await supabase
    .from('user_progress')
    .select('starred, correct_count, wrong_count')
    .eq('user_id', user_id)
    .eq('flashcard_id', flashcardId)
    .maybeSingle()
  if (existing.error) throw new Error(`讀取進度失敗：${existing.error.message}`)

  const prev = existing.data ?? { starred: false, correct_count: 0, wrong_count: 0 }
  const { error } = await supabase.from('user_progress').upsert(
    {
      user_id,
      flashcard_id: flashcardId,
      starred: prev.starred || !correct,
      correct_count: prev.correct_count + (correct ? 1 : 0),
      wrong_count: prev.wrong_count + (correct ? 0 : 1),
      last_result: correct,
      last_tested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,flashcard_id' },
  )
  if (error) throw new Error(`記錄作答失敗：${error.message}`)
}

export async function saveQuizSession(
  folderId: string,
  config: QuizConfig,
  totalQuestions: number,
  correctCount: number,
): Promise<void> {
  const user_id = await currentUserId()
  const { error } = await supabase.from('quiz_sessions').insert({
    user_id,
    folder_id: folderId,
    question_type: config.questionType,
    direction: config.direction,
    scope: config.scope,
    total_questions: totalQuestions,
    correct_count: correctCount,
  })
  if (error) throw new Error(`儲存測驗紀錄失敗：${error.message}`)
}

// ---------- 學習統計 ----------

export interface ProgressRow {
  flashcard_id: string
  starred: boolean
  correct_count: number
  wrong_count: number
  last_tested_at: string | null
}

/** 本人全部的學習進度列（RLS 自動限定範圍） */
export async function listAllProgress(): Promise<ProgressRow[]> {
  const res = await supabase
    .from('user_progress')
    .select('flashcard_id, starred, correct_count, wrong_count, last_tested_at')
  return unwrap(res, '讀取學習進度')
}

export interface QuizSessionRow {
  id: string
  folder_id: string
  question_type: string
  direction: string
  scope: string
  total_questions: number
  correct_count: number
  created_at: string
}

/** 本人全部的測驗紀錄，依時間舊到新 */
export async function listAllQuizSessions(): Promise<QuizSessionRow[]> {
  const res = await supabase
    .from('quiz_sessions')
    .select('id, folder_id, question_type, direction, scope, total_questions, correct_count, created_at')
    .order('created_at')
  return unwrap(res, '讀取測驗紀錄')
}

export interface CardLite {
  id: string
  japanese: string
  kana: string
  chinese: string
  set_name: string
  level_id: number
}

/** 本人全部單字卡（含所屬資料集名稱與級別），統計頁分組用 */
export async function listAllCardsLite(): Promise<CardLite[]> {
  const res = await supabase
    .from('flashcards')
    .select('id, japanese, kana, chinese, folders(study_sets(name, level_id))')
  type Row = {
    id: string
    japanese: string
    kana: string
    chinese: string
    folders: { study_sets: { name: string; level_id: number } | null } | null
  }
  const rows = unwrap(res, '讀取單字清單') as unknown as Row[]
  return rows.map((r) => ({
    id: r.id,
    japanese: r.japanese,
    kana: r.kana,
    chinese: r.chinese,
    set_name: r.folders?.study_sets?.name ?? '未分類',
    level_id: r.folders?.study_sets?.level_id ?? 0,
  }))
}

// ---------- AI 翻譯（Edge Function） ----------

export async function translateChinese(chinese: string): Promise<TranslateResult> {
  const { data, error } = await supabase.functions.invoke('translate', {
    body: { chinese },
  })
  if (error) throw new Error(`AI 翻譯失敗：${error.message}`)
  if (data?.error) throw new Error(data.error)
  return data as TranslateResult
}
