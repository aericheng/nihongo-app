// 測驗流程內部使用的型別，不進 src/lib/types.ts（那邊只放跨模組契約）
import type { CardWithProgress } from '../../lib/types'

export interface QuizQuestion {
  /** 本題正解 */
  card: CardWithProgress
  /** 四選一選項（含正解，已洗牌）；文字輸入題不需要選項，固定為空陣列 */
  options: CardWithProgress[]
}
