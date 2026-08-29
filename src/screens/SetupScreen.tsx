import { useMemo, useState } from 'react'
import { PRESET_CATEGORIES } from '../categories'
import { LANGUAGE_NAMES, translator } from '../i18n'
import { teamColor } from '../theme'
import {
  MAX_CATEGORIES,
  MAX_TEAMS,
  MIN_CATEGORIES,
  MIN_TEAMS,
  TIME_OPTIONS,
  type Difficulty,
  type EndMode,
  type Language,
  type Settings,
} from '../types'

const LANGUAGES: Language[] = ['en', 'es', 'lt']
const DIFFICULTIES: Difficulty[] = ['casual', 'balanced', 'hard']
const TARGET_SCORES = [20, 30, 50]

interface Props {
  onStart: (settings: Settings) => void
}

export function SetupScreen({ onStart }: Props) {
  const [language, setLanguage] = useState<Language>('en')
  const [teamNames, setTeamNames] = useState(['Team 1', 'Team 2'])
  const [presetIndexes, setPresetIndexes] = useState<number[]>([0, 2, 5, 7, 10])
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [customDraft, setCustomDraft] = useState('')
  const [secondsPerQuestion, setSecondsPerQuestion] = useState<number>(TIME_OPTIONS[1])
  const [difficulty, setDifficulty] = useState<Difficulty>('balanced')
  const [speedBonus, setSpeedBonus] = useState(true)
  const [endMode, setEndMode] = useState<EndMode>('board')
  const [targetScore, setTargetScore] = useState(TARGET_SCORES[1])

  const t = useMemo(() => translator(language), [language])
  const presets = PRESET_CATEGORIES[language]

  // Presets are stored by index, so switching language re-labels them in place.
  const categories = [...presetIndexes.map((i) => presets[i]), ...customCategories]
  const full = categories.length >= MAX_CATEGORIES

  const togglePreset = (index: number) =>
    setPresetIndexes((current) =>
      current.includes(index)
        ? current.filter((i) => i !== index)
        : full
          ? current
          : [...current, index],
    )

  const addCustom = () => {
    const name = customDraft.trim()
    if (!name || full) return
    if (categories.some((c) => c.toLowerCase() === name.toLowerCase())) return
    setCustomCategories((current) => [...current, name])
    setCustomDraft('')
  }

  const randomize = () => {
    const size = presetIndexes.length || 5
    const pool = presets.map((_, i) => i)
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    setPresetIndexes(pool.slice(0, Math.min(size, MAX_CATEGORIES - customCategories.length)))
  }

  const setTeamName = (index: number, name: string) =>
    setTeamNames((current) => current.map((existing, i) => (i === index ? name : existing)))

  const error =
    categories.length < MIN_CATEGORIES
      ? t('needMoreCategories', { n: MIN_CATEGORIES })
      : teamNames.some((name) => !name.trim())
        ? t('needTeamNames')
        : null

  return (
    <div className="screen">
      <header className="setup-header">
        <h1>{t('appTitle')}</h1>
        <p>{t('tagline')}</p>
      </header>

      <div className="setup-grid">
        <section className="panel">
          <div className="field">
            <span className="eyebrow">{t('language')}</span>
            <div className="seg">
              {LANGUAGES.map((code) => (
                <button
                  key={code}
                  aria-pressed={language === code}
                  onClick={() => setLanguage(code)}
                >
                  {LANGUAGE_NAMES[code]}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="eyebrow">{t('teams')}</span>
            {teamNames.map((name, index) => (
              <div className="team-row" key={index}>
                <span className="team-dot" style={{ background: teamColor(index), color: teamColor(index) }} />
                <input
                  className="text-input"
                  value={name}
                  maxLength={24}
                  placeholder={t('teamName')}
                  onChange={(event) => setTeamName(index, event.target.value)}
                />
                <button
                  className="btn btn-ghost"
                  disabled={teamNames.length <= MIN_TEAMS}
                  onClick={() => setTeamNames((current) => current.filter((_, i) => i !== index))}
                >
                  {t('removeTeam')}
                </button>
              </div>
            ))}
            <button
              className="btn"
              disabled={teamNames.length >= MAX_TEAMS}
              onClick={() => setTeamNames((current) => [...current, `Team ${current.length + 1}`])}
            >
              + {t('addTeam')}
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="field">
            <div className="row">
              <span className="eyebrow">{t('categories')}</span>
              <span className="spacer" />
              <span className="hint" style={{ margin: 0 }}>
                {t('selectedCount', { n: categories.length, max: MAX_CATEGORIES })}
              </span>
            </div>
            <div className="chips">
              {presets.map((name, index) => (
                <button
                  key={name}
                  className="chip"
                  aria-pressed={presetIndexes.includes(index)}
                  disabled={full && !presetIndexes.includes(index)}
                  onClick={() => togglePreset(index)}
                >
                  {name}
                </button>
              ))}
              {customCategories.map((name) => (
                <button
                  key={name}
                  className="chip chip-custom"
                  aria-pressed
                  onClick={() =>
                    setCustomCategories((current) => current.filter((c) => c !== name))
                  }
                >
                  {name}
                  <span className="chip-remove">×</span>
                </button>
              ))}
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <input
                className="text-input"
                style={{ flex: 1, minWidth: 180 }}
                value={customDraft}
                maxLength={40}
                placeholder={t('customCategory')}
                onChange={(event) => setCustomDraft(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && addCustom()}
              />
              <button className="btn" onClick={addCustom} disabled={!customDraft.trim() || full}>
                {t('add')}
              </button>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn btn-ghost" onClick={randomize}>
                🎲 {t('randomize')}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setPresetIndexes([])
                  setCustomCategories([])
                }}
              >
                {t('clearAll')}
              </button>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="field">
            <span className="eyebrow">{t('timePerQuestion')}</span>
            <div className="seg">
              {TIME_OPTIONS.map((value) => (
                <button
                  key={value}
                  aria-pressed={secondsPerQuestion === value}
                  onClick={() => setSecondsPerQuestion(value)}
                >
                  {value} {t('seconds')}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="eyebrow">{t('difficulty')}</span>
            <div className="seg">
              {DIFFICULTIES.map((value) => (
                <button
                  key={value}
                  aria-pressed={difficulty === value}
                  onClick={() => setDifficulty(value)}
                >
                  {t(value)}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="eyebrow">{t('speedBonus')}</span>
            <div className="seg">
              <button aria-pressed={speedBonus} onClick={() => setSpeedBonus(true)}>
                {t('on')}
              </button>
              <button aria-pressed={!speedBonus} onClick={() => setSpeedBonus(false)}>
                {t('off')}
              </button>
            </div>
            <p className="hint">{t('speedBonusHint')}</p>
          </div>

          <div className="field">
            <span className="eyebrow">{t('gameEnd')}</span>
            <div className="seg">
              <button aria-pressed={endMode === 'board'} onClick={() => setEndMode('board')}>
                {t('endBoard')}
              </button>
              <button aria-pressed={endMode === 'target'} onClick={() => setEndMode('target')}>
                {t('endTarget')}
              </button>
            </div>
            {endMode === 'target' && (
              <div className="seg" style={{ marginTop: 8 }}>
                {TARGET_SCORES.map((value) => (
                  <button
                    key={value}
                    aria-pressed={targetScore === value}
                    onClick={() => setTargetScore(value)}
                  >
                    {value} {t('points')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="setup-footer">
        {error && <span className="error">{error}</span>}
        <button
          className="btn btn-primary"
          disabled={!!error}
          onClick={() =>
            onStart({
              language,
              teamNames,
              categories,
              secondsPerQuestion,
              difficulty,
              speedBonus,
              endMode,
              targetScore,
            })
          }
        >
          {t('startGame')} →
        </button>
      </footer>
    </div>
  )
}
