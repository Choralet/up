import type { CSSProperties } from 'react'
import type { Branch } from '../data/types'
import { branchLevel, weeklyStreak } from '../engine/stats'
import { localDate } from '../lib/time'
import { useProgress } from '../store/ProgressContext'
import { accentStyle, BRANCH_META } from './branches'
import { Icon } from './Icon'

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

export function LevelBadge({ branch, level, size = 'sm' }: { branch: Branch; level: number; size?: 'sm' | 'lg' }) {
  return (
    <span className={`lvbadge ${size}`} style={accentStyle(branch)} aria-hidden="true">
      {size === 'lg' && <small>{BRANCH_META[branch].label}</small>}
      <b>{level}</b>
      <small>{size === 'lg' ? 'Level' : 'LVL'}</small>
    </span>
  )
}

/** A rounded progress bar. With `from`, it fills from that ratio to `ratio` (motion only, see styles.css). */
export function XpBar({ ratio, from, label }: { ratio: number; from?: number; label: string }) {
  const r = clamp01(ratio)
  const f = from === undefined ? r : clamp01(from)
  return (
    <span className={from === undefined ? 'xpbar' : 'xpbar grow'} role="img" aria-label={label} style={{ '--r': String(r), '--from': String(f) } as CSSProperties}>
      <i />
    </span>
  )
}

export function BranchLevel({ branch }: { branch: Branch }) {
  const { nodes, progress } = useProgress()
  const l = branchLevel(nodes, progress, branch)
  const name = BRANCH_META[branch].label
  return (
    <div className="lvrow" style={accentStyle(branch)}>
      <LevelBadge branch={branch} level={l.level} />
      <div className="lvinfo">
        <span className="lvcap" aria-hidden="true"><span>{name}</span> <span className="lvcount">{l.done}/{l.total}</span></span>
        <XpBar ratio={l.ratio} label={`${name}: ${l.done} of ${l.total} steps`} />
      </div>
    </div>
  )
}

export function Streak() {
  const { progress } = useProgress()
  const weeks = weeklyStreak(progress.logs, progress.schedule, localDate())
  return (
    <span className="streak" role="img" aria-label={weeks > 0 ? `${weeks} week streak` : 'No streak yet'}>
      <Icon name="flame" size={18} />
      <span aria-hidden="true">{weeks} wk</span>
    </span>
  )
}
