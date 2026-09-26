import { useState, type CSSProperties } from 'react'
import { goalMet, newlyUnlockedSkills, nodeState, suggestNext, todaysValues } from '../engine/progress'
import { goalText } from '../lib/format'
import { formatClock, localDate } from '../lib/time'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META } from './branches'
import { ConfirmSheet } from './ConfirmSheet'
import { DemoButton } from './DemoButton'
import { HoldTimer } from './HoldTimer'
import { LevelUpSheet } from './LevelUpSheet'
import { SetSheet } from './SetSheet'

export function LogScreen({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const { nodes, byId, progress, log, levelUp, editSet, removeSet } = useProgress()
  const node = byId.get(nodeId)!
  const meta = BRANCH_META[node.branch]
  const last = [...progress.logs].reverse().find((l) => l.nodeId === nodeId)?.value
  const [reps, setReps] = useState(last ?? node.goal.target)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)
  const [holdStart, setHoldStart] = useState<number | null>(null)
  const [askClose, setAskClose] = useState(false)

  const today = localDate()
  const entries = progress.logs.flatMap((l, i) => (l.nodeId === nodeId && l.date === today ? [{ value: l.value, index: i }] : []))
  const values = entries.map((e) => e.value)
  const unit = node.goal.type === 'hold' ? ' s' : ''
  const editN = entries.findIndex((e) => e.index === editing)
  const atGoal = values.filter((v) => v >= node.goal.target).length

  const isFocus = nodeState(node, progress) === 'focus'
  const ready = isFocus && goalMet(node.goal, values)

  const record = (value: number) => {
    if (value < 1) return
    // read "today" at tap time so a session left open past midnight counts the right day
    const before = todaysValues(progress, nodeId, localDate())
    log(nodeId, value)
    const crossed = !goalMet(node.goal, before) && goalMet(node.goal, [...before, value])
    if (isFocus && crossed) setShowLevelUp(true)
  }

  return (
    <div className="log" style={{ '--accent': meta.color } as CSSProperties}>
      <div className="screen">
        <button className="close" onClick={() => (holdStart !== null ? setAskClose(true) : onClose())}>Done</button>
        <div className="eyebrow" style={{ color: node.kind === 'skill' ? 'var(--skill)' : undefined }}>
          {meta.label}{node.kind === 'skill' ? ' · Skill' : ''}
        </div>
        <h1 className="large" style={{ fontSize: 26 }}>{node.name}</h1>
        <div className="pills" style={{ justifyContent: 'center' }}>
          <span className="pill">Goal {goalText(node.goal)}</span>
          <DemoButton node={node} />
        </div>
        <div className="bars" aria-hidden="true">
          {Array.from({ length: node.goal.sets }, (_, i) => <i key={i} className={i < atGoal ? 'on' : ''} />)}
        </div>
        <div className="sub">{atGoal} of {node.goal.sets} sets at goal</div>

        {node.goal.type === 'reps' ? (
          <>
            <div className="big" data-testid="rep-value">{reps}</div>
            <div className="sub">reps{last ? ` · last time ${last}` : ''}</div>
            <div className="steps">
              <button aria-label="Decrease reps" onClick={() => setReps((r) => Math.max(1, r - 1))}>−</button>
              <button aria-label="Increase reps" onClick={() => setReps((r) => r + 1)}>+</button>
            </div>
            <button className="cta" style={{ background: 'var(--accent)' }} onClick={() => record(reps)}>Log Set</button>
          </>
        ) : (
          <HoldTimer target={node.goal.target} onStop={(s) => record(s)} onRunningChange={setHoldStart} />
        )}

        {ready && !showLevelUp && (
          <button className="cta sec" onClick={() => setShowLevelUp(true)}>Level Up</button>
        )}

        {entries.length > 0 && (
          <>
            <div className="chips" aria-label="Sets logged today">
              {entries.map((e, n) => (
                <button key={e.index} className="pill chip" aria-label={`Edit set ${n + 1}: ${e.value}${unit}`} onClick={() => setEditing(e.index)}>
                  {e.value}{unit}
                </button>
              ))}
            </div>
            <div className="sub" style={{ marginTop: 6, fontSize: 12 }}>Tap a set to fix it</div>
          </>
        )}
        <p className="cue sub" style={{ marginTop: 16 }}>{node.cue}</p>
      </div>

      {askClose && holdStart !== null && (
        <ConfirmSheet
          title="A hold is running"
          message={`${formatClock((Date.now() - holdStart) / 1000)} so far. Log it before you leave?`}
          actions={[
            { label: 'Log It', tone: 'primary', onClick: () => { const s = Math.floor((Date.now() - holdStart) / 1000); if (s >= 1) log(nodeId, s); onClose() } },
            { label: 'Discard', tone: 'danger', onClick: onClose },
          ]}
          onCancel={() => setAskClose(false)}
        />
      )}

      {editN >= 0 && (
        <SetSheet
          number={editN + 1}
          unit={unit}
          initial={entries[editN].value}
          color={meta.color}
          onSave={(v) => { editSet(entries[editN].index, v); setEditing(null) }}
          onRemove={() => { removeSet(entries[editN].index); setEditing(null) }}
          onClose={() => setEditing(null)}
        />
      )}

      {showLevelUp && (
        <LevelUpSheet
          node={node}
          suggestions={suggestNext(nodes, progress, nodeId)}
          unlockedSkills={newlyUnlockedSkills(nodes, progress, nodeId)}
          onDismiss={() => setShowLevelUp(false)}
          onPick={(toId) => { levelUp(nodeId, toId); setShowLevelUp(false); onClose() }}
        />
      )}
    </div>
  )
}
