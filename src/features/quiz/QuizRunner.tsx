// 出題／作答／對錯回饋畫面。答對自動前進，答錯停留看解答，手動按「下一題」才前進。
import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { CardWithProgress, Direction, QuizConfig } from '../../lib/types'
import { recordAnswer } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { TextInput } from '../../components/ui/TextInput'
import { QuizOverlay } from './QuizOverlay'
import { ResultScreen } from './ResultScreen'
import { buildQuestionPool, isTypingAnswerCorrect } from './logic'

interface Props {
  folderId: string
  allCards: CardWithProgress[]
  config: QuizConfig
  /** 每次成功呼叫過 recordAnswer 時通知上層（用來決定關閉時要不要 onProgressChanged） */
  onAnswered: () => void
  /** 結果頁按「再測一次」：回到設定 Modal */
  onRetry: () => void
  /** 中途關閉或結果頁「完成」：整個結束測驗 */
  onClose: () => void
}

type Phase = 'answering' | 'feedback'

const AUTO_ADVANCE_MS = 900

export function QuizRunner({ folderId, allCards, config, onAnswered, onRetry, onClose }: Props) {
  const questions = useMemo(() => buildQuestionPool(allCards, config), [allCards, config])
  const total = questions.length

  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('answering')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCards, setWrongCards] = useState<CardWithProgress[]>([])
  const [apiWarning, setApiWarning] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const current = questions[index]

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
    },
    [],
  )

  useEffect(() => {
    if (!apiWarning) return
    const t = setTimeout(() => setApiWarning(null), 4000)
    return () => clearTimeout(t)
  }, [apiWarning])

  function goNext() {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current)
      advanceTimer.current = null
    }
    if (index + 1 >= total) {
      setFinished(true)
      return
    }
    setIndex((i) => i + 1)
    setPhase('answering')
    setSelectedId(null)
    setTypedAnswer('')
    setIsCorrect(null)
  }

  function submitAnswer(correct: boolean, selected?: string) {
    if (phase !== 'answering') return
    setPhase('feedback')
    setIsCorrect(correct)
    if (selected !== undefined) setSelectedId(selected)
    if (correct) {
      setCorrectCount((c) => c + 1)
    } else {
      setWrongCards((w) => [...w, current.card])
    }
    onAnswered()
    recordAnswer(current.card.id, correct).catch((err: unknown) => {
      setApiWarning(err instanceof Error ? err.message : '記錄作答失敗，請檢查網路連線')
    })
    if (correct) {
      advanceTimer.current = setTimeout(goNext, AUTO_ADVANCE_MS)
    }
  }

  function handleChoiceSelect(option: CardWithProgress) {
    if (phase !== 'answering') return
    submitAnswer(option.id === current.card.id, option.id)
  }

  function handleTypingSubmit() {
    if (phase !== 'answering' || typedAnswer.trim() === '') return
    submitAnswer(isTypingAnswerCorrect(typedAnswer, current.card, config.direction))
  }

  function handleTypingKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // IME（中文/日文輸入法）組字中按下的 Enter 不算送出，否則會把選字用的 Enter 誤判成交卷
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleTypingSubmit()
    }
  }

  if (total === 0) {
    return (
      <QuizOverlay onClose={onClose} header={<p className="text-sm font-semibold text-slate-700">測驗</p>}>
        <p className="py-10 text-center text-slate-500">沒有可測驗的單字卡</p>
      </QuizOverlay>
    )
  }

  if (finished) {
    return (
      <ResultScreen
        folderId={folderId}
        config={config}
        total={total}
        correct={correctCount}
        wrongCards={wrongCards}
        onRetry={onRetry}
        onClose={onClose}
      />
    )
  }

  return (
    <QuizOverlay
      onClose={onClose}
      cornerWarning={apiWarning ? `⚠ ${apiWarning}` : undefined}
      header={
        <div>
          <p className="mb-1 text-xs font-medium text-slate-500">
            第 {index + 1} / {total} 題
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${(index / total) * 100}%` }}
            />
          </div>
        </div>
      }
    >
      <QuestionPrompt config={config} card={current.card} />

      {config.questionType === 'choice' ? (
        <ChoiceOptions
          options={current.options}
          correctId={current.card.id}
          selectedId={selectedId}
          phase={phase}
          direction={config.direction}
          onSelect={handleChoiceSelect}
        />
      ) : (
        <TypingAnswer
          value={typedAnswer}
          disabled={phase !== 'answering'}
          onChange={setTypedAnswer}
          onKeyDown={handleTypingKeyDown}
          onSubmit={handleTypingSubmit}
        />
      )}

      {phase === 'feedback' && isCorrect && <CorrectFeedback />}

      {phase === 'feedback' && isCorrect === false && (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg bg-rose-50 px-4 py-3 text-rose-600">
            <p className="text-sm font-semibold">✗ 答錯了，已自動加入 ⭐ 錯題標記</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="font-jp text-base font-semibold text-slate-800">
              {current.card.kana || current.card.japanese}
              {current.card.kana && current.card.japanese !== current.card.kana && (
                <span className="ml-2 text-sm font-normal text-slate-400">{current.card.japanese}</span>
              )}
            </p>
            <p className="mt-1 text-sm text-slate-600">{current.card.chinese}</p>
            {current.card.notes && <p className="mt-1 text-xs text-slate-400">{current.card.notes}</p>}
          </div>
          <div className="flex justify-end">
            <Button onClick={goNext}>下一題 →</Button>
          </div>
        </div>
      )}
    </QuizOverlay>
  )
}

function CorrectFeedback() {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div
      className={`mt-4 flex items-center justify-center gap-2 rounded-lg bg-emerald-50 py-3 text-emerald-600 transition-all duration-300 ${
        shown ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
      }`}
    >
      <span className="text-2xl">✓</span>
      <span className="text-sm font-semibold">答對了！</span>
    </div>
  )
}

function QuestionPrompt({ config, card }: { config: QuizConfig; card: CardWithProgress }) {
  const isJp2Zh = config.direction === 'jp2zh'
  const promptText =
    config.questionType === 'choice'
      ? isJp2Zh
        ? '請選出正確的中文意思'
        : '請選出正確的日文'
      : isJp2Zh
        ? '請輸入正確的中文意思'
        : '請輸入正確的日文（漢字或假名皆可）'

  return (
    <div className="mb-6 text-center">
      <p className="mb-3 text-xs font-medium text-slate-400">{promptText}</p>
      {isJp2Zh ? (
        // 只出假名，不出漢字——漢字對中文使用者等於直接暴雷答案
        <p className="font-jp text-3xl font-bold text-slate-800">{card.kana || card.japanese}</p>
      ) : (
        <p className="text-3xl font-bold text-slate-800">{card.chinese}</p>
      )}
    </div>
  )
}

function ChoiceOptions({
  options,
  correctId,
  selectedId,
  phase,
  direction,
  onSelect,
}: {
  options: CardWithProgress[]
  correctId: string
  selectedId: string | null
  phase: Phase
  direction: Direction
  onSelect: (option: CardWithProgress) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const isCorrectOption = option.id === correctId
        const isSelected = option.id === selectedId
        let style = 'border-slate-300 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50'
        if (phase === 'feedback') {
          if (isCorrectOption) style = 'border-emerald-500 bg-emerald-50 text-emerald-700'
          else if (isSelected) style = 'border-rose-500 bg-rose-50 text-rose-700'
          else style = 'border-slate-200 text-slate-400'
        }
        return (
          <button
            key={option.id}
            type="button"
            disabled={phase !== 'answering'}
            onClick={() => onSelect(option)}
            className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed ${style}`}
          >
            {direction === 'jp2zh' ? (
              option.chinese
            ) : (
              // 選項只出假名——漢字會和中文題目互相對照暴雷
              <span className="font-jp">{option.kana || option.japanese}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function TypingAnswer({
  value,
  disabled,
  onChange,
  onKeyDown,
  onSubmit,
}: {
  value: string
  disabled: boolean
  onChange: (v: string) => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  onSubmit: () => void
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <TextInput
          autoFocus
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="輸入答案後按 Enter 或送出"
        />
      </div>
      <Button onClick={onSubmit} disabled={disabled || value.trim() === ''}>
        送出
      </Button>
    </div>
  )
}
