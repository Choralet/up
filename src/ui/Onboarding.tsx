import { useRef, useState } from 'react'
import { DAY_LABEL, WEEKDAYS } from '../data/schedule'
import { MAIN_TRACKS as TRACKS } from '../data/tracks'
import type { ExerciseNode } from '../data/types'
import { assignDays, levelUp, mainLineNext, setEquipment, type Progress } from '../engine/progress'
import { useProgress } from '../store/ProgressContext'
import { Icon } from './Icon'
import { EquipmentPicker } from './EquipmentPicker'

/** Ignore a second tap this soon after an answer (a double tap would otherwise answer the next question). */
export const onboardingTuning = { answerLockMs: 350 }

export function question(node: ExerciseNode): string {
  const { type, sets, target, per } = node.goal
  const each = per ? ` per ${per}` : ''
  if (type === 'hold') return sets === 1 ? `Can you hold it for ${target} s${each}?` : `Can you hold it for ${target} s${each}, ${sets} times?`
  return `Can you do ${sets} ${sets === 1 ? 'set' : 'sets'} of ${target} clean reps${each}?`
}

interface Snapshot {
  draft: Progress
  step: number
}

/** New users start with a wall (the floor is always there). */
export const DEFAULT_KIT = ['wall']

/**
 * step -1 = intro, 0 = your equipment, 1..n = one main track each, then the summary.
 * Answers change a draft; nothing is saved until Start Training.
 */
export function Onboarding() {
  const { progress, nodes, byId, finalById, completeSteps, setDayType, setEquipment: saveEquipment, finishOnboarding } = useProgress()
  const [draft, setDraft] = useState<Progress>(progress)
  const [kit, setKit] = useState<string[]>(() => progress.settings.equipment ?? DEFAULT_KIT)
  const [step, setStep] = useState(-1)
  const [history, setHistory] = useState<Snapshot[]>([])
  const [days, setDays] = useState<boolean[]>(() => progress.schedule.map((d) => d !== 'rest'))
  const lastAnswer = useRef(-Infinity)

  // skip tracks with nothing left to ask, so no empty frame is ever drawn
  let s = step
  while (s >= 1 && s <= TRACKS.length && !draft.focus[TRACKS[s - 1].id]) s++
  const track = s >= 1 && s <= TRACKS.length ? TRACKS[s - 1] : null
  // ask about the full goal: placement is about what you can already do, not the easier start
  const node = track ? finalById.get(draft.focus[track.id]!) : undefined

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
    saveEquipment(draft.settings.equipment ?? null)
    const known = new Set(progress.completed)
    completeSteps(draft.completed.filter((id) => !known.has(id)))
    assignDays(progress.schedule, days, progress.settings.plan).forEach((type, weekday) => setDayType(weekday, type))
    finishOnboarding()
  }

  let body
  if (s === -1) {
    body = (
      <>
        <h1 className="large">Find your level</h1>
        <p className="sub intro">
          A few quick questions so Up starts each movement (push-ups, pull-ups, squats…) at the right exercise. It takes about a minute, and nothing changes until you finish.
        </p>
        <button className="cta" onClick={answer(() => setStep(0))}>Start</button>
        <button className="cta sec" onClick={finishOnboarding}>Skip for Now</button>
      </>
    )
  } else if (s === 0) {
    body = (
      <>
        <h1 className="large title-sm intro-title">What do you have?</h1>
        <p className="sub intro">Up only suggests exercises you can do. The floor is always there; tick the rest. You can change this any time in Settings.</p>
        <EquipmentPicker value={kit} onChange={setKit} />
        <p className="note">A sturdy chair or bench counts as Bench / box, a table edge as Low bar / table.</p>
        <button className="cta spaced" onClick={answer(() => { setDraft((d) => setEquipment(nodes, d, kit)); setStep(1) })}>Next</button>
      </>
    )
  } else if (track && node) {
    body = (
      <>
        <div className="eyebrow">{track.name} · {s} of {TRACKS.length}</div>
        <h1 className="large title-sm intro-title">{node.name}</h1>
        <p className="question">{question(node)}</p>
        <p className="sub">{node.cue}</p>
        <button className="cta spaced" onClick={answer(() => setDraft((d) => levelUp(nodes, d, node.id, mainLineNext(nodes, d, node.id))))}>Yes</button>
        <button className="cta sec" onClick={answer(() => setStep(s + 1))}>Not Yet</button>
      </>
    )
  } else {
    const picked = days.filter(Boolean).length
    const plan = assignDays(progress.schedule, days, progress.settings.plan)
    body = (
      <>
        <h1 className="large">You're set</h1>
        <div className="group">
          {TRACKS.map((t) => {
            const id = draft.focus[t.id]
            const finished = nodes.every((n) => n.track !== t.id || draft.completed.includes(n.id))
            return (
              <div className="row" key={t.id}>
                <span className="t"><b>{t.name}: {id ? byId.get(id)!.name : finished ? 'Complete' : 'Needs equipment'}</b></span>
              </div>
            )
          })}
        </div>
        <h2 className="hdr">Training days</h2>
        <p className="note">{progress.settings.plan === 'full' ? 'Each day you pick gets a full-body workout (three days is ideal). Change days or the plan later in Settings.' : 'Each day you pick gets a workout; days you already train keep theirs. Change any day later in Settings.'}</p>
        <div className="group">
          {WEEKDAYS.map((name, i) => (
            <button key={name} className="check pick" role="checkbox" aria-checked={days[i]} aria-label={name}
              onClick={() => setDays((d) => d.map((v, j) => (j === i ? !v : v)))}>
              <span className="box" aria-hidden="true">{days[i] && <Icon name="check" size={14} />}</span>
              <span className="lbl">{name}</span>
              {days[i] && <span className="amount">{DAY_LABEL[plan[i]].replace(' Day', '')}</span>}
            </button>
          ))}
        </div>
        <button className="cta" onClick={apply}>Start Training</button>
        {picked === 0 && <p className="note">No days picked: every day will be a rest day until you set some in Settings.</p>}
        {picked > 0 && picked < 3 && progress.settings.plan === 'ppl' && <p className="note">With {picked === 1 ? 'one day' : 'two days'}, some muscle groups wait until you add more days.</p>}
      </>
    )
  }

  return (
    <div className="log onboarding" role="dialog" aria-modal="true" aria-label="Find your level">
      <div className="screen left">
        <div className="obnav">
          {s >= 0 ? <button className="close" onClick={back}>Back</button> : <span />}
          <button className="close" onClick={finishOnboarding}>Close</button>
        </div>
        {body}
      </div>
    </div>
  )
}
