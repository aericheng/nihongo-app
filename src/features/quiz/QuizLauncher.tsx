// 契約檔：FolderPage（Agent B）只 import 這個元件；測驗內部流程（Agent C）全部藏在 features/quiz/ 內。
import { useRef, useState } from 'react'
import type { CardWithProgress, QuizConfig } from '../../lib/types'
import { Button } from '../../components/ui/Button'
import { QuizSettingsModal } from './QuizSettingsModal'
import { QuizRunner } from './QuizRunner'

export interface QuizLauncherProps {
  folderId: string
  cards: CardWithProgress[]
  /** 測驗過程中星星有變動（答錯自動加星）時呼叫，讓 FolderPage 重新載入列表 */
  onProgressChanged: () => void
}

type Stage = 'closed' | 'settings' | 'running'

export function QuizLauncher({ folderId, cards, onProgressChanged }: QuizLauncherProps) {
  const [stage, setStage] = useState<Stage>('closed')
  const [config, setConfig] = useState<QuizConfig | null>(null)
  // 用 ref 而非 state：只在「整個測驗關閉」那一刻讀取一次，不需要觸發重繪
  const answeredAnyRef = useRef(false)

  function closeAll() {
    setStage('closed')
    setConfig(null)
    if (answeredAnyRef.current) {
      answeredAnyRef.current = false
      onProgressChanged()
    }
  }

  function handleStart(nextConfig: QuizConfig) {
    setConfig(nextConfig)
    setStage('running')
  }

  function handleRetry() {
    setStage('settings')
  }

  function handleAnswered() {
    answeredAnyRef.current = true
  }

  return (
    <>
      <Button disabled={cards.length === 0} onClick={() => setStage('settings')}>
        📝 測驗模式
      </Button>

      <QuizSettingsModal open={stage === 'settings'} cards={cards} onClose={closeAll} onStart={handleStart} />

      {stage === 'running' && config && (
        <QuizRunner
          folderId={folderId}
          allCards={cards}
          config={config}
          onAnswered={handleAnswered}
          onRetry={handleRetry}
          onClose={closeAll}
        />
      )}
    </>
  )
}
