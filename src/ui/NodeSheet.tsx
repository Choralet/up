import { useState } from 'react'
import type { ExerciseNode } from '../data/types'
import { nodeState } from '../engine/progress'
import { goalText } from '../lib/format'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META, nodeAccent } from './branches'
import { DemoButton } from './DemoButton'
import { GoalEditor } from './GoalEditor'
import { trackById } from '../data/tracks'
import { HistorySheet } from './HistorySheet'
import { skillName } from '../data/names'
import { Icon } from './Icon'

const LABEL = { locked: 'Locked', available: 'Ready', focus: 'Training', completed: 'Done' } as const

export function NodeSheet({ node, onClose, onLog }: { node: ExerciseNode; onClose: () => void; onLog: (id: string) => void }) {
  const { finalById, progress, byId, defaults, setFocus, activateSkill, deactivateSkill, setGoal } = useProgress()
  const [editing, setEditing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const state = nodeState(node, progress)
  const meta = BRANCH_META[node.branch]
  const chainActive = node.skill ? node.skill in progress.skillFocus : false
  const slotsFull = Object.keys(progress.skillFocus).length >= 2

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={node.name} style={nodeAccent(node)}>
        <div className="eyebrow accent">{meta.label} · {LABEL[state]}</div>
        <h2>{node.name}</h2>
        {node.track && <div className="sub">Track: {trackById(node.track)?.name}</div>}
        <div className="pills">
          <span className="pill">Goal {goalText(node.goal)}</span>
          {node.kind === 'skill' && <span className="pill skill">Skill</span>}
          <DemoButton node={node} />
          <button className="howto histbtn" onClick={() => setShowHistory(true)}>History</button>
        </div>
        {node.requires.map((id) => {
          const ok = progress.completed.includes(id)
          return (
            <div className="req" key={id}>
              <span className={ok ? 'ok' : 'nx'} aria-hidden="true"><Icon name={ok ? 'check' : 'dots'} size={12} /></span>
              Requires {byId.get(id)?.name ?? id}
            </div>
          )
        })}
        <p className="cue">{node.cue}</p>
        {editing ? (
          <GoalEditor
            node={finalById.get(node.id) ?? node}
            def={defaults.get(node.id)!}
            onSave={(g) => { setGoal(node.id, g); setEditing(false) }}
            onReset={() => { setGoal(node.id, null); setEditing(false) }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            {state === 'available' && !node.skill && (
              <button className="cta" onClick={() => { setFocus(node.id); onClose() }}>Make This My Focus</button>
            )}
            {state === 'available' && node.skill && !chainActive && !slotsFull && (
              <button className="cta" onClick={() => { activateSkill(node.skill!); onClose() }}>Train This Skill</button>
            )}
            {state === 'available' && node.skill && !chainActive && slotsFull && (
              <>
                <p className="sub">Two skills are active. Replace one to train this:</p>
                {Object.keys(progress.skillFocus).map((id) => (
                  <button key={id} className="cta sec" onClick={() => { deactivateSkill(id); activateSkill(node.skill!); onClose() }}>
                    Replace {skillName(id, progress.skillFocus[id])}
                  </button>
                ))}
              </>
            )}
            {state === 'focus' && (
              <button className="cta" onClick={() => { onLog(node.id); onClose() }}>Log This Exercise</button>
            )}
            {state !== 'completed' && (
              <button className="cta sec" onClick={() => setEditing(true)}>Edit Goal</button>
            )}
            <button className="cta sec" onClick={onClose}>Close</button>
          </>
        )}
      </div>
      {showHistory && <HistorySheet node={node} onClose={() => setShowHistory(false)} />}
    </>
  )
}
