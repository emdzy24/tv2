import { useEffect, useMemo, useRef, useState } from 'react'
import { BoardScreen } from './screens/BoardScreen'
import { GameOverScreen } from './screens/GameOverScreen'
import { LoadingScreen } from './screens/LoadingScreen'
import { QuestionScreen } from './screens/QuestionScreen'
import { RevealScreen } from './screens/RevealScreen'
import { SetupScreen } from './screens/SetupScreen'
import { StealOfferScreen } from './screens/StealOfferScreen'
import { clearGame, loadGame, saveGame } from './game/storage'
import { createGame, reduce, type Action } from './game/state'
import { generateBoard } from './services/questions'
import { translator } from './i18n'
import { POINT_VALUES, type GameState, type Settings } from './types'

type Stage =
  | { kind: 'setup' }
  | { kind: 'loading'; settings: Settings; done: number; total: number }
  | { kind: 'game'; state: GameState }

export function App() {
  // A game in progress survives an accidental refresh.
  const [stage, setStage] = useState<Stage>(() => {
    const saved = loadGame()
    return saved ? { kind: 'game', state: saved } : { kind: 'setup' }
  })
  const generation = useRef<AbortController | null>(null)

  useEffect(() => {
    if (stage.kind === 'game') saveGame(stage.state)
  }, [stage])

  useEffect(() => () => generation.current?.abort(), [])

  const language = stage.kind === 'setup' ? 'en' : stage.kind === 'loading' ? stage.settings.language : stage.state.settings.language
  const t = useMemo(() => translator(language), [language])

  const startGame = async (settings: Settings) => {
    const controller = new AbortController()
    generation.current = controller
    setStage({
      kind: 'loading',
      settings,
      done: 0,
      total: settings.categories.length * POINT_VALUES.length,
    })

    try {
      const categories = await generateBoard(
        settings,
        (done, total) =>
          setStage((current) =>
            current.kind === 'loading' ? { ...current, done, total } : current,
          ),
        controller.signal,
      )
      if (controller.signal.aborted) return
      setStage({ kind: 'game', state: createGame(settings, categories) })
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return
      console.error('Could not build the board', error)
      setStage({ kind: 'setup' })
    }
  }

  const dispatch = (action: Action) =>
    setStage((current) =>
      current.kind === 'game' ? { kind: 'game', state: reduce(current.state, action) } : current,
    )

  const quit = () => {
    generation.current?.abort()
    clearGame()
    setStage({ kind: 'setup' })
  }

  if (stage.kind === 'setup') return <SetupScreen onStart={startGame} />
  if (stage.kind === 'loading') return <LoadingScreen done={stage.done} total={stage.total} t={t} />

  const state: GameState = stage.state
  switch (state.phase) {
    case 'question':
      return (
        <QuestionScreen
          state={state}
          t={t}
          onAnswer={(given) => dispatch({ type: 'answer', given, at: Date.now() })}
          onTimeout={() => dispatch({ type: 'timeout', at: Date.now() })}
        />
      )
    case 'reveal':
      return (
        <RevealScreen
          state={state}
          t={t}
          onOverride={(correct) => dispatch({ type: 'override', correct })}
          onContinue={() => dispatch({ type: 'continue' })}
        />
      )
    case 'steal-offer':
      return (
        <StealOfferScreen
          state={state}
          t={t}
          onDecide={(accept) => dispatch({ type: 'steal', accept })}
        />
      )
    case 'gameover':
      return <GameOverScreen state={state} t={t} onPlayAgain={quit} />
    default:
      return (
        <BoardScreen
          state={state}
          t={t}
          onPick={(categoryId, value) => dispatch({ type: 'pick', categoryId, value })}
          onQuit={() => {
            if (window.confirm(t('quitConfirm'))) quit()
          }}
        />
      )
  }
}
