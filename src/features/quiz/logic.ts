// 測驗出題與判分的純函式，不碰 React 狀態、不呼叫 api——方便單獨驗證邏輯正確性。
import type { CardWithProgress, Direction, QuizConfig } from '../../lib/types'
import type { QuizQuestion } from './quizTypes'

/** Fisher-Yates 洗牌，回傳新陣列，不改動原陣列 */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = result[i]
    result[i] = result[j]
    result[j] = tmp
  }
  return result
}

/**
 * 依測驗設定組出題目池。
 * - scope 決定「出哪些卡」（全部 or 僅星星錯題）。
 * - 選擇題的干擾項一律從全部 cards 抽（即使 scope 是 starred，也不會被侷限在錯題池內），
 *   從全部卡中排除正解後洗牌取 3 張，和正解一起再洗牌一次，選項順序在建題當下就固定。
 */
export function buildQuestionPool(allCards: CardWithProgress[], config: QuizConfig): QuizQuestion[] {
  const base = config.scope === 'starred' ? allCards.filter((c) => c.starred) : allCards
  const shuffledBase = shuffle(base)

  // 選項的顯示文字：日翻中顯示中文、中翻日顯示假名。
  // 干擾項若與正解（或彼此）顯示文字相同（同音詞、同義翻譯），會出現兩個一模一樣的選項，必須排除。
  const displayText = (c: CardWithProgress) =>
    config.direction === 'jp2zh' ? c.chinese.trim() : (c.kana || c.japanese).trim()

  return shuffledBase.map((card) => {
    if (config.questionType !== 'choice') return { card, options: [] }
    const seen = new Set([displayText(card)])
    const distractors: CardWithProgress[] = []
    for (const candidate of shuffle(allCards)) {
      if (candidate.id === card.id) continue
      const text = displayText(candidate)
      if (seen.has(text)) continue
      seen.add(text)
      distractors.push(candidate)
      if (distractors.length === 3) break
    }
    return { card, options: shuffle([card, ...distractors]) }
  })
}

/**
 * 日翻中拼寫的目標中文：取第一個義項、去掉括號註記。
 * 「高的；貴的」→「高的」、「母親（稱自己的）」→「母親」——拼寫不該要求拼出說明文字。
 */
export function chineseSpellingTarget(card: CardWithProgress): string {
  const target = card.chinese
    .replace(/（[^）]*）/g, '')
    .split(/[;；]/)[0]
    .trim()
  return target || card.chinese.trim()
}

/**
 * 日翻中拼寫的中文字塊：目標中文逐字拆開＋從其他卡的中文抽干擾字，洗牌。
 * 中文沒有「完整鍵盤」可顯示，字塊庫就是它的鍵盤——干擾字給足量以維持難度。
 */
export function buildChineseTiles(card: CardWithProgress, allCards: CardWithProgress[]): string[] {
  const answerChars = Array.from(chineseSpellingTarget(card))
  const decoyPool = Array.from(
    new Set(
      allCards
        .filter((c) => c.id !== card.id)
        .flatMap((c) => Array.from(chineseSpellingTarget(c)))
        .filter((ch) => ch.trim() !== '' && !answerChars.includes(ch)),
    ),
  )
  const decoyCount = Math.max(6, 15 - answerChars.length)
  const decoys = shuffle(decoyPool).slice(0, decoyCount)
  return shuffle([...answerChars, ...decoys])
}

/** 拼寫題答案比對：日翻中比對目標中文（第一義項）；中翻日接受漢字或假名寫法 */
export function isTypingAnswerCorrect(input: string, card: CardWithProgress, direction: Direction): boolean {
  const answer = input.trim()
  if (direction === 'jp2zh') return answer === chineseSpellingTarget(card)
  return answer === card.japanese.trim() || answer === card.kana.trim()
}

/** 依答對率給鼓勵語：全對 / ≥80% / 其他 三檔 */
export function encouragement(correct: number, total: number): string {
  if (total > 0 && correct === total) return '全對！太厲害了 🎉'
  if (total > 0 && correct / total >= 0.8) return '表現很棒，再接再厲！💪'
  return '沒關係，錯的地方多複習幾次就會記住！📚'
}
