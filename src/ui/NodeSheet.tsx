import type { CSSProperties } from 'react'
import type { ExerciseNode } from '../data/types'
import { nodeState } from '../engine/progress'
import { goalText } from '../lib/format'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META } from './branches'

const LABEL = { locked: 'Locked', available: 'Unlocked', focus: 'Focus', completed: 'Completed' } as const

export function NodeSheet({ node, onClose, onLog }: { node: ExerciseNode; onClose: () => void; onLog: (id: string) => void }) {
  const { progress, byId, setFocus } = useProgress()
  const state = nodeState(node, progress)
  const meta = BRANCH_META[node.branch]

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={node.name} style={{ '--accent': meta.color } as CSSProperties}>
        <div className="eyebrow">{meta.label} · {LABEL[state]}</div>
        <h2>{node.name}</h2>
        <div className="pills">
          <span className="pill">Goal {goalText(node.goal)}</span>
          {node.kind === 'skill' && <span className="pill skill">Skill</span>}
        </div>
        {node.requires.map((id) => {
          const ok = progress.completed.includes(id)
          return (
            <div className="req" key={id}>
              <span className={ok ? 'ok' : 'nx'} aria-hidden="true">{ok ? '✓' : '…'}</span>
              Requires {byId.get(id)?.name ?? id}
            </div>
          )
        })}
        <p className="cue">{node.cue}</p>
        {state === 'available' && (
          <button className="cta" onClick={() => { setFocus(node.id); onClose() }}>Make This My Focus</button>
        )}
        {state === 'focus' && (
          <button className="cta" onClick={() => { onLog(node.id); onClose() }}>Log This Exercise</button>
        )}
        <button className="cta sec" onClick={onClose}>Close</button>
      </div>
    </>
  )
}
