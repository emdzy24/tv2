import React from 'react'

export function Badge({ team, size = 34 }) {
  const [bg, fg] = team.colors
  const abbr = team.id
  return (
    <span
      className="badge"
      style={{ background: bg, color: pickText(bg), width: size, height: size, fontSize: size * 0.38 }}
      title={team.name}
    >
      {abbr}
    </span>
  )
}

export function OvrBadge({ value }) {
  const cls = value >= 85 ? 'hi' : value >= 75 ? 'mid' : 'lo'
  return <span className={`ovr ${cls}`}>{value}</span>
}

export function PosChip({ pos }) {
  return <span className="pos-chip">{pos}</span>
}

// Choose readable text color for a given hex background.
function pickText(hex) {
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#111' : '#fff'
}
