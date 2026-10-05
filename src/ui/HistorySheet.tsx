import { useState } from 'react'
import type { ExerciseNode } from '../data/types'
import { history } from '../engine/stats'
import { plural } from '../lib/format'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META } from './branches'

const W = 320
const H = 150
const PAD = { l: 30, r: 12, t: 12, b: 22 }

/** Chart top: some room above the goal, and even, so the middle gridline is a whole number. */
export function chartTop(max: number): number {
  const top = Math.ceil(max * 1.15)
  return top % 2 === 0 ? top : top + 1
}

const shortDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

/** Best set per session over time: one series, so no legend; the title names it. */
export function HistorySheet({ node, onClose }: { node: ExerciseNode; onClose: () => void }) {
  const { progress } = useProgress()
  const [tip, setTip] = useState<number | null>(null)
  // the same exercise in another tree (a twin) shares its history
  const ids = [node.id, ...(node.twins ?? [])]
  const all = history(progress.logs.filter((l) => ids.includes(l.nodeId)).map((l) => ({ ...l, nodeId: node.id })), node.id)
  const rows = all.slice(-12)
  const unit = node.goal.type === 'hold' ? 's' : 'reps'
  const color = BRANCH_META[node.branch].color
  const max = chartTop(Math.max(node.goal.target, ...rows.map((r) => r.best)))
  const x = (i: number) => PAD.l + (rows.length === 1 ? (W - PAD.l - PAD.r) / 2 : (i * (W - PAD.l - PAD.r)) / (rows.length - 1))
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b)
  const best = Math.max(0, ...all.map((r) => r.best))

  return (
    <>
      <div className="scrim top" onClick={onClose} />
      <div className="sheet top left" role="dialog" aria-modal="true" aria-label={`History: ${node.name}`}>
        <div className="head">
          <h3>{node.name}</h3>
          <button className="pillbtn" onClick={onClose}>Done</button>
        </div>
        {rows.length === 0 ? (
          <p className="sub">No sets logged yet. Your history starts with the first set.</p>
        ) : (
          <>
            <p className="sub">Best: {best} {unit} · {plural(all.length, 'session')}</p>
            <svg className="histchart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Best ${unit} per session, last ${rows.length}`}>
              {[0, 0.5, 1].map((f) => (
                <g key={f}>
                  <line x1={PAD.l} x2={W - PAD.r} y1={y(max * f)} y2={y(max * f)} className="grid" />
                  <text x={PAD.l - 6} y={y(max * f) + 4} textAnchor="end" className="axis">{max * f}</text>
                </g>
              ))}
              <line x1={PAD.l} x2={W - PAD.r} y1={y(node.goal.target)} y2={y(node.goal.target)} className="goalline" />
              <polyline className="histline" fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"
                points={rows.map((r, i) => `${x(i)},${y(r.best)}`).join(' ')} />
              {rows.map((r, i) => (
                <g key={r.date} onClick={() => setTip(tip === i ? null : i)}>
                  <circle cx={x(i)} cy={y(r.best)} r="14" fill="transparent" />
                  <circle cx={x(i)} cy={y(r.best)} r="4.5" fill={color} stroke="var(--card)" strokeWidth="2" />
                </g>
              ))}
              <text x={PAD.l} y={H - 4} className="axis">{shortDate(rows[0].date)}</text>
              <text x={W - PAD.r} y={H - 4} textAnchor="end" className="axis">{shortDate(rows[rows.length - 1].date)}</text>
            </svg>
            {tip !== null && rows[tip] && (
              <p className="sub" role="status">{shortDate(rows[tip].date)} · best {rows[tip].best} {unit} · {plural(rows[tip].sets, 'set')}</p>
            )}
            <p className="hint">Dashed line: your goal ({node.goal.target} {unit}).</p>
            <ul className="summary">
              {[...all].reverse().map((r) => (
                <li key={r.date}><b>{shortDate(r.date)}</b><span className="sub">{plural(r.sets, 'set')} · best {r.best} {unit}</span></li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  )
}
