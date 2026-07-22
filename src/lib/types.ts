// 對應 supabase/migrations/0001_init.sql 的資料表結構
// 欄位名刻意與 DB snake_case 一致，避免每層轉換

export interface Level {
  id: number
  code: string // 'N1' ~ 'N5'
  name: string
  position: number
}

export interface StudySet {
  id: string
  user_id: string
  level_id: number
  name: string
  created_at: string
}

export interface Folder {
  id: string
  study_set_id: string
  user_id: string
  name: string
  position: number
  created_at: string
}

export interface Flashcard {
  id: string
  folder_id: string
  user_id: string
  japanese: string
  kana: string
  chinese: string
  notes: string
  position: number
  created_at: string
}

/** 詞庫頁與測驗使用的主要型別：單字卡＋本人的學習進度（星星） */
export interface CardWithProgress extends Flashcard {
  starred: boolean
  correct_count: number
  wrong_count: number
}

export type QuestionType = 'choice' | 'typing'
export type Direction = 'jp2zh' | 'zh2jp'
export type QuizScope = 'all' | 'starred'

export interface QuizConfig {
  questionType: QuestionType
  direction: Direction
  scope: QuizScope
}

/** Edge function `translate` 的回傳格式 */
export interface TranslateResult {
  japanese: string
  kana: string
  notes: string
}

/** 每個子資料夾的單字上限（第三層的 50 詞規範） */
export const FOLDER_CAPACITY = 50

/** 依既有資料夾數量產生下一個資料夾的建議名稱：單字 1-50、單字 51-100… */
export function suggestNextFolderName(existingFolderCount: number): string {
  const start = existingFolderCount * FOLDER_CAPACITY + 1
  const end = (existingFolderCount + 1) * FOLDER_CAPACITY
  return `單字 ${start}-${end}`
}
