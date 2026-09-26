import { useRef, useState } from 'react'
import { DAY_LABEL, WEEKDAYS } from '../data/schedule'
import type { DayType, ExerciseNode } from '../data/types'
import { BRANCHES } from '../engine/graph'
import { levelUp, type Progress } from '../engine/progress'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META } from './branches'

/** Ignore a second tap this soon after an answer (a double tap would otherwise answer the next question). */
export const onboardingTuning = { answerLockMs: 350 }

const ROTATION: DayType[] = ['push', 'pull', 'legs']

/**
 * Workout type per weekday for the ticked days. Days that already had a workout keep it (a custom schedule survives);
 * newly ticked days get the type used least so far (ties: Push, Pull, Legs + Core).
 */
export function assignDays(schedule: DayType[], ticked: boolean[]): DayType[] {
  const count: Record<string, number> = { push: 0, pull: 0, legs: 0 }
  schedule.forEach((d, i) => { if (ticked[i] && d !== 'rest') count[d]++ })
  return schedule.map((d, i) => {
    if (!ticked[i]) return 'rest'
    if (d !== 'rest') return d
    const pick = [...ROTATION].sort((a, b) => count[a] - count[b])[0]
    count[pick]++
    return pick
  })
}

function question(node: ExerciseNode): string {
  return node.goal.type === 'hold'
    ? `Can you hold it for ${node.goal.target} s, ${node.goal.sets} times?`
    : `Can you do ${node.goal.sets} sets of ${node.goal.target} clean reps?`
}

interface Snapshot {
  draft: Progress
  step: number
}

/** step -1 = intro, 0..3 = one branch each, 4 = summary. Answers change a draft; nothing is saved until Start Training. */
export function Onboarding() {
  const { progress, nodes, byId, completeSteps, setDayType, finishOnboarding } = useProgress()
  const [draft, setDraft] = useState<Progress>(progress)
  const [step, setStep] = useState(-1)
  const [history, setHistory] = useState<Snapshot[]>([])
  const [days, setDays] = useState<boolean[]>(() => progress.schedule.map((d) => d !== 'rest'))
  const lastAnswer = useRef(-Infinity)

  // skip branches with nothing left to ask, so no empty frame is ever drawn
  let s = step
  while (s >= 0 && s < BRANCHES.length && !draft.focus[BRANCHES[s]]) s++
  const branch = s >= 0 && s < BRANCHES.length ? BRANCHES[s] : null
  const node = branch ? byId.get(draft.focus[branch]!) : undefined

  const answer = (next: () => void) => () => {
    const now = Date.now()
    if (now - lastAnswer.current < onboardingTuning.answerLockMs) return
    lastAnswer.current = now
    setHistory((h) => [...h, { draft, step }])
    next()
  }

  const back = () => {
    const prev = history[history.length - 1]
    if (!prev) return setStep(-1)
    setHistory((h) => h.slice(0, -1))
    setDraft(prev.draft)
    setStep(prev.step)
  }

  const apply = () => {
    const known = new Set(progress.completed)
    completeSteps(draft.completed.filter((id) => !known.has(id)))
    assignDays(progress.schedule, days).forEach((type, weekday) => setDayType(weekday, type))
    finishOnboarding()
  }

  let body
  if (s === -1) {
    body = (
      <>
        <h1 className="large">Find your level</h1>
        <p className="sub" style={{ margin: '8px 0 24px' }}>
          A few quick questions so Up starts each muscle group at the right exercise. It takes about a minute, and nothing changes until you finish.
        </p>
        <button className="cta" onClick={() => setStep(0)}>Start</button>
        <button className="cta sec" onClick={finishOnboarding}>Skip for Now</button>
      </>
    )
  } else if (branch && node) {
    body = (
      <>
        <div className="eyebrow">{BRANCH_META[branch].label} · {s + 1} of {BRANCHES.length}</div>
        <h1 className="large" style={{ fontSize: 26, margin: '8px 0' }}>{node.name}</h1>
        <p style={{ fontSize: 17, margin: '8px 0' }}>{question(node)}</p>
        <p className="sub">{node.cue}</p>
        <button className="cta" style={{ marginTop: 24 }} onClick={answer(() => setDraft((d) => levelUp(nodes, d, node.id, null)))}>Yes</button>
        <button className="cta sec" onClick={answer(() => setStep(s + 1))}>Not Yet</button>
      </>
    )
  } else {
    const picked = days.filter(Boolean).length
    const plan = assignDays(progress.schedule, days)
    body = (
      <>
        <h1 className="large">You're set</h1>
        <div className="group">
          {BRANCHES.map((b) => {
            const id = draft.focus[b]
            return (
              <div className="row" key={b}>
                <span className="t"><b>{BRANCH_META[b].label}: {id ? byId.get(id)!.name : 'Complete'}</b></span>
              </div>
            )
          })}
        </div>
        <h2 className="hdr">Training days</h2>
        <p className="sub" style={{ margin: '12px 4px 0' }}>Each day you pick gets a workout; days you already train keep theirs. Change any day later in Settings.</p>
        <div className="group">
          {WEEKDAYS.map((name, i) => (
            <button key={name} className="check" role="checkbox" aria-checked={days[i]} aria-label={name}
              onClick={() => setDays((d) => d.map((v, j) => (j === i ? !v : v)))}>
              <span className="box" aria-hidden="true">{days[i] ? '✓' : ''}</span>
              <span className="lbl">{name}</span>
              {days[i] && <span className="amount">{DAY_LABEL[plan[i]].replace(' Day', '')}</span>}
            </button>
          ))}
        </div>
        <button className="cta" onClick={apply}>Start Training</button>
        {picked === 0 && <p className="sub">No days picked: every day will be a rest day until you set some in Settings.</p>}
        {picked > 0 && picked < 3 && <p className="sub">With {picked === 1 ? 'one day' : 'two days'}, some muscle groups wait until you add more days.</p>}
      </>
    )
  }

  return (
    <div className="log onboarding" role="dialog" aria-modal="true" aria-label="Find your level">
      <div className="screen" style={{ textAlign: 'left' }}>
        <div className="obnav">
          {s >= 0 ? <button className="close" onClick={back}>Back</button> : <span />}
          <button className="close" onClick={finishOnboarding}>Close</button>
        </div>
        {body}
      </div>
    </div>
  )
}
