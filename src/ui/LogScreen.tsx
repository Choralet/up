import { useEffect, useReducer, useRef, useState, type CSSProperties } from 'react'
import { effectiveGoal, FINAL_STAGE, goalMet, newlyUnlockedSkills, nodeState, suggestNext, todaysValues } from '../engine/progress'
import { goalText } from '../lib/format'
import { stepperStart } from '../engine/workout'
import { formatClock, localDate } from '../lib/time'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META, SKILL_STRONG } from './branches'
import { ConfirmSheet } from './ConfirmSheet'
import { DemoButton } from './DemoButton'
import { demoUrl } from '../data/demos'
import { roadmapItemFor, videoUrl } from '../data/roadmap'
import { HistorySheet } from './HistorySheet'
import { HoldTimer } from './HoldTimer'
import { LevelUpSheet } from './LevelUpSheet'
import { SetSheet } from './SetSheet'

/** Ignore a second Log Set this soon after the first (a double tap would log two sets). Tests set 0. */
export const logTuning = { doubleTapMs: 600 }

export function LogScreen({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const { nodes, byId, finalById, progress, log, levelUp, editSet, removeSet, advanceStage } = useProgress()
  const node = byId.get(nodeId)!
  const meta = BRANCH_META[node.branch]
  // start from what you did last session, not from the goal (3 quick taps must not fake a level-up)
  const [start] = useState(() => stepperStart(progress, nodeId, localDate(), node.goal.target))
  const [reps, setReps] = useState(start.value)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)
  const [holdStart, setHoldStart] = useState<number | null>(null)
  const [askClose, setAskClose] = useState(false)
  const [timerKey, setTimerKey] = useState(0)
  // during the countdown nothing is running yet: just leave
  const leave = () => (holdStart !== null && Date.now() >= holdStart ? setAskClose(true) : onClose())
  const [, tick] = useReducer((n: number) => n + 1, 0)
  // keep the "A hold is running" sheet's time live
  useEffect(() => {
    if (!askClose) return
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [askClose])

  const today = localDate()
  const entries = progress.logs.flatMap((l, i) => (l.nodeId === nodeId && l.date === today ? [{ value: l.value, index: i }] : []))
  const values = entries.map((e) => e.value)
  const unit = node.goal.type === 'hold' ? ' s' : ''
  const editN = entries.findIndex((e) => e.index === editing)
  const atGoal = values.filter((v) => v >= node.goal.target).length

  const isFocus = nodeState(node, progress) === 'focus'
  const stage = progress.goalStage[nodeId]
  const final = finalById.get(nodeId) ?? node
  const ready = isFocus && goalMet(final.goal, values)
  const [goalUp, setGoalUp] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const lastTap = useRef(-Infinity)
  const [fresh, setFresh] = useState<number | null>(null)

  /** Log a set; returns true when it opened the level-up suggestion. */
  const record = (value: number): boolean => {
    if (value < 1) return false
    const now = Date.now()
    if (now - lastTap.current < logTuning.doubleTapMs) return false
    lastTap.current = now
    // read "today" at tap time so a session left open past midnight counts the right day
    const before = todaysValues(progress, nodeId, localDate())
    log(nodeId, value)
    setFresh(progress.logs.length) // index the new set will have: highlight its chip
    const after = [...before, value]
    // the full goal offers the level-up; an easier ramp stage only raises the goal for next time
    const crossed = isFocus && !goalMet(final.goal, before) && goalMet(final.goal, after)
    if (crossed) setShowLevelUp(true)
    else if (isFocus && stage !== undefined && stage < FINAL_STAGE && !goalMet(node.goal, before) && goalMet(node.goal, after)) {
      advanceStage(nodeId)
      setGoalUp(`Goal up: ${goalText(effectiveGoal(final.goal, stage + 1))} next time`)
    }
    return crossed
  }

  return (
    <div className="log" style={{ '--accent': meta.color, '--accent-strong': node.kind === 'skill' ? SKILL_STRONG : meta.strong } as CSSProperties}>
      <div className="screen">
        <button className="close" onClick={leave}>Done</button>
        <div className="eyebrow" style={{ color: node.kind === 'skill' ? 'var(--skill)' : undefined }}>
          {meta.label}{node.kind === 'skill' ? ' · Skill' : ''}
        </div>
        <h1 className="large" style={{ fontSize: 26 }}>{node.name}</h1>
        <div className="pills" style={{ justifyContent: 'center' }}>
          <span className="pill">Goal {goalText(node.goal)}</span>
          <DemoButton node={node} />
          <button className="howto histbtn" onClick={() => setShowHistory(true)}>History</button>
          {!demoUrl(node.id) && roadmapItemFor(node.id) && (
            <a className="howto" href={videoUrl(roadmapItemFor(node.id)!)} target="_blank" rel="noopener noreferrer">Watch in Video</a>
          )}
        </div>
        <div className="bars" aria-hidden="true">
          {Array.from({ length: node.goal.sets }, (_, i) => <i key={i} className={i < atGoal ? 'on' : ''} />)}
        </div>
        <div className="sub">{atGoal} of {node.goal.sets} sets at goal</div>
        {goalUp && <div className="goalup" role="status">{goalUp}</div>}

        {node.goal.type === 'reps' ? (
          <>
            <div className="big" data-testid="rep-value" aria-live="polite">{reps}</div>
            <div className="sub">reps{start.lastSession !== null ? ` · last session ${start.lastSession}` : ''}</div>
            <div className="steps">
              <button aria-label="Decrease reps" onClick={() => setReps((r) => Math.max(1, r - 1))}>−</button>
              <button aria-label="Increase reps" onClick={() => setReps((r) => r + 1)}>+</button>
            </div>
            <button className="cta" style={{ background: 'var(--accent-strong, var(--accent))' }} onClick={() => record(reps)}>Log Set</button>
          </>
        ) : (
          <HoldTimer key={timerKey} target={node.goal.target} sound={progress.settings.holdSound} onStop={(s) => record(s)} onRunningChange={setHoldStart} />
        )}

        {ready && !showLevelUp && holdStart === null && (
          <button className="cta sec" onClick={() => setShowLevelUp(true)}>Level Up</button>
        )}

        {entries.length > 0 && (
          <>
            <div className="chips" aria-label="Sets logged today">
              {entries.map((e, n) => (
                <button key={e.index} className={`pill chip${e.index === fresh ? ' new' : ''}`} aria-label={`Edit set ${n + 1}: ${e.value}${unit}`} onClick={() => setEditing(e.index)}>
                  {e.value}{unit}
                </button>
              ))}
            </div>
            <div className="sub" style={{ marginTop: 6, fontSize: 12 }}>Tap a set to fix it</div>
          </>
        )}
        <p className="cue sub" style={{ marginTop: 16 }}>{node.cue}</p>
        {/* a second, thumb-reachable way out */}
        <button className="cta sec" style={{ marginTop: 24 }} onClick={leave}>Back to Workout</button>
      </div>

      {askClose && holdStart !== null && (
        <ConfirmSheet
          title="A hold is running"
          message={`${formatClock(Math.max(0, Date.now() - holdStart) / 1000)} so far. Log it before you leave?`}
          actions={[
            { label: 'Log It', tone: 'primary', onClick: () => { const s = Math.floor((Date.now() - holdStart) / 1000); setAskClose(false); setHoldStart(null); setTimerKey((k) => k + 1); lastTap.current = -Infinity; if (!record(s)) onClose() } },
            { label: 'Discard', tone: 'danger', onClick: onClose },
          ]}
          onCancel={() => setAskClose(false)}
        />
      )}

      {showHistory && <HistorySheet node={node} onClose={() => setShowHistory(false)} />}

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
