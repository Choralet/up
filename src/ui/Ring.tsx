import type { CSSProperties } from 'react'

const R = 32
const C = 2 * Math.PI * R

/** Our own quiet ring (not Apple's Activity rings). `value` is 0 to 1. */
export function Ring({ value, color, label }: { value: number; color: string; label: string }) {
  const v = Math.max(0, Math.min(1, value))
  return (
    <svg viewBox="0 0 80 80" width="76" height="76" role="img" aria-label={label} style={{ '--ring': color } as CSSProperties}>
      <circle cx="40" cy="40" r={R} fill="none" stroke="var(--fill)" strokeWidth="10" />
      <circle cx="40" cy="40" r={R} fill="none" stroke="var(--ring)" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={C * (1 - v)} transform="rotate(-90 40 40)" />
    </svg>
  )
}
