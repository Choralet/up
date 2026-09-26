import { useMemo, useState } from 'react'
import { DAY_LABEL, WARMUP, WEEKDAYS } from '../data/schedule'
import { SKILLS } from '../data/skills'
import type { DayType, ExerciseNode } from '../data/types'
import { goalMet, todaysValues } from '../engine/progress'
import { buildWorkout, nextTrainingDay, workoutDone } from '../engine/workout'
import { goalText } from '../lib/format'
import { localDate, weekdayIndex } from '../lib/time'
import { useProgress } from '../store/ProgressContext'
import { BackupNotice } from './BackupNotice'
import { BRANCH_META } from './branches'

const TRAIN_ANYWAY: Exclude<DayType, 'rest'>[] = ['push', 'pull', 'legs']
const ANYWAY_LABEL = { push: 'Push', pull: 'Pull', legs: 'Legs + Core' } as const

export function TodayScreen({ onOpen, onSettings, settingsOpen = false }: { onOpen: (nodeId: string) => void; onSettings: () => void; settingsOpen?: boolean }) {
  const { nodes, progress } = useProgress()
  const [pick, setPick] = useState<DayType | null>(null)
  const [warm, setWarm] = useState<Record<string, boolean>>({})

  const now = new Date()
  const today = localDate(now)
  const weekday = weekdayIndex(now)
  const day = pick ?? progress.schedule[weekday]
  const workout = useMemo(() => buildWorkout(nodes, progress, day, SKILLS), [nodes, progress, day])
  const next = nextTrainingDay(progress.schedule, weekday)
  const heading = now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })

  const row = (node: ExerciseNode) => {
    const values = todaysValues(progress, node.id, today)
    const atGoal = values.filter((v) => v >= node.goal.target).length
    const meta = BRANCH_META[node.branch]
    return (
      <button className="row" key={node.id} onClick={() => onOpen(node.id)}>
        <span className="dot" style={{ background: node.kind === 'skill' ? 'var(--skill)' : meta.color }}>{meta.short}</span>
        <span className="t">
          {node.kind === 'skill' && <span className="tag">SKILL</span>}
          <b>{node.name}</b>
          <span>{goalText(node.goal)} · {atGoal} of {node.goal.sets} sets today</span>
        </span>
        {goalMet(node.goal, values) ? <span className="tick" aria-label="Goal reached">✓</span> : <span className="chev" aria-hidden="true">›</span>}
      </button>
    )
  }

  return (
    <div className="screen">
      <div className="head">
        <div>
          <div className="sub" style={{ fontWeight: 600 }}>{heading}</div>
          <h1 className="large">{DAY_LABEL[day]}</h1>
        </div>
        <button className="gear" aria-label="Settings" onClick={onSettings}>⚙</button>
      </div>
      <BackupNotice refresh={settingsOpen} onOpen={onSettings} />

      {day === 'rest' ? (
        <>
          <div className="card">
            <b>Recovery is part of the plan.</b>
            <div className="sub" style={{ marginTop: 4 }}>
              {next ? `Next: ${WEEKDAYS[(weekday + next.daysAhead) % 7]} · ${DAY_LABEL[next.day]}` : 'No training days are scheduled. Set some in Settings.'}
            </div>
          </div>
          <div className="hdr">Feeling fresh?</div>
          <div style={{ marginTop: 16 }}>
            {TRAIN_ANYWAY.map((d) => (
              <button key={d} className="pillbtn" aria-label={`Train ${ANYWAY_LABEL[d]} anyway`} onClick={() => setPick(d)}>
                Train {ANYWAY_LABEL[d]} anyway
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {pick && (
            <button className="pillbtn" onClick={() => setPick(null)}>Back to {DAY_LABEL[progress.schedule[weekday]].toLowerCase()}</button>
          )}
          <div className="hdr">Warm-up</div>
          <div className="group">
            {WARMUP[day].map((item) => {
              const key = `${day}:${item}`
              const on = !!warm[key]
              return (
                <button key={key} className="check" role="checkbox" aria-checked={on} aria-label={item} onClick={() => setWarm((w) => ({ ...w, [key]: !on }))}>
                  <span className="box" aria-hidden="true">{on ? '✓' : ''}</span>
                  <span className="lbl">{item}</span>
                </button>
              )
            })}
          </div>

          {workout.skill.length > 0 && (
            <>
              <div className="hdr">Skill</div>
              <div className="group">{workout.skill.map(row)}</div>
            </>
          )}

          <div className="hdr">Strength</div>
          <div className="group">
            {workout.main.map(({ branch, node }) =>
              node ? row(node) : (
                <div className="row" key={branch}>
                  <span className="dot" style={{ background: BRANCH_META[branch].color }}>{BRANCH_META[branch].short}</span>
                  <span className="t"><b>{BRANCH_META[branch].label}</b><span>Branch complete</span></span>
                </div>
              ),
            )}
          </div>
          {workoutDone(workout, progress, today) && <div className="done-banner">Workout complete</div>}
        </>
      )}
    </div>
  )
}
