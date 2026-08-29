import { useEffect, useState } from 'react'

interface Props {
  startedAt: number
  seconds: number
  onExpire: () => void
  label: string
}

/** Counts down from a fixed start time so a re-render can never add time. */
export function Timer({ startedAt, seconds, onExpire, label }: Props) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(id)
  }, [startedAt])

  const remaining = Math.max(0, seconds - (now - startedAt) / 1000)

  useEffect(() => {
    if (remaining <= 0) onExpire()
  }, [remaining <= 0])

  const fraction = seconds > 0 ? remaining / seconds : 0
  const level = fraction <= 0.15 ? 'danger' : fraction <= 0.35 ? 'warning' : ''

  return (
    <>
      <div className={`timer ${level}`}>
        <span className="eyebrow">{label}</span>
        <span className="timer-value">{Math.ceil(remaining)}</span>
      </div>
      <div className="timer-track">
        <div className={`timer-bar ${level}`} style={{ width: `${fraction * 100}%` }} />
      </div>
    </>
  )
}
