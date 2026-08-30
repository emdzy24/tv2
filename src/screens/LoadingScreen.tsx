import type { Translate } from '../i18n'

interface Props {
  done: number
  total: number
  t: Translate
  error?: string | null
  onRetry?: () => void
  onCancel?: () => void
}

/** Each tile flips over as its question comes back, so progress is felt, not read. */
export function LoadingScreen({ done, total, t, error, onRetry, onCancel }: Props) {
  const cells = Array.from({ length: total }, (_, i) => i)
  const percent = total > 0 ? (done / total) * 100 : 0

  if (error) {
    return (
      <div className="screen">
        <div className="loading">
          <div>
            <span className="eyebrow">{t('generationFailed')}</span>
            <h2>{error}</h2>
          </div>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={onRetry}>
              {t('tryAgain')}
            </button>
            <button className="btn btn-ghost" onClick={onCancel}>
              {t('backToSetup')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="loading">
        <div>
          <span className="eyebrow">{t('buildingHint')}</span>
          <h2>{t('buildingBoard')}</h2>
        </div>

        <div className="loading-grid">
          {cells.map((index) => (
            <div
              key={index}
              className={`loading-cell ${index < done ? 'filled' : index === done ? 'pending' : ''}`}
              style={{ animationDelay: `${(index % 8) * 40}ms` }}
            >
              {index < done ? [2, 4, 6][index % 3] : ''}
            </div>
          ))}
        </div>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <p>{t('questionsReady', { done, total })}</p>
      </div>
    </div>
  )
}
