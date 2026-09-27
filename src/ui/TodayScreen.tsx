import { useMemo, useState } from 'react'
import { DAY_LABEL, WARMUP, WEEKDAYS } from '../data/schedule'
import { SKILLS } from '../data/skills'
import type { DayType, ExerciseNode } from '../data/types'
import { goalMet, todayState, todaysValues } from '../engine/progress'
import { buildWorkout, nextTrainingDay, workoutDone } from '../engine/workout'
import { FinishSheet } from './FinishSheet'
import { goalText } from '../lib/format'
import { localDate, weekdayIndex } from '../lib/time'
import { useProgress } from '../store/ProgressContext'
import { AchievementCard } from './AchievementCard'
import { BackupNotice } from './BackupNotice'
import { BRANCH_META } from './branches'
import { trackById } from '../data/tracks'

const TRAIN_ANYWAY: Exclude<DayType, 'rest'>[] = ['push', 'pull', 'legs']
const ANYWAY_LABEL = { push: 'Push', pull: 'Pull', legs: 'Legs + Core' } as const

export function TodayScreen({ onOpen, onSettings, settingsOpen = false }: { onOpen: (nodeId: string) => void; onSettings: () => void; settingsOpen?: boolean }) {
  const { nodes, progress, setDayPick, toggleWarm } = useProgress()
  const now = new Date()
  const today = localDate(now)
  // saved per date, so it survives tab switches and reloads, and a new day starts fresh
  const { pick, warm } = todayState(progress, today)
  const weekday = weekdayIndex(now)
  const day = pick ?? progress.schedule[weekday]
  const workout = useMemo(() => buildWorkout(nodes, progress, day, SKILLS, progress.settings.length), [nodes, progress, day])
  const next = nextTrainingDay(progress.schedule, weekday)
  const heading = now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })

  const [finishing, setFinishing] = useState(false)
  const unit = (node: ExerciseNode) => (node.goal.type === 'hold' ? ' s' : '')

  const row = (node: ExerciseNode, tag?: string) => {
    const values = todaysValues(progress, node.id, today)
    const meta = BRANCH_META[node.branch]
    const logged = values.length
    const status = logged === 0
      ? goalText(node.goal)
      : `${goalText(node.goal)} · ${Math.min(logged, node.goal.sets)} of ${node.goal.sets} sets · best ${Math.max(...values)}${unit(node)}`
    return (
      <button className="row" key={`${tag ?? 'main'}:${node.id}`} onClick={() => onOpen(node.id)}>
        <span className="dot" style={{ background: node.kind === 'skill' ? 'var(--skill)' : meta.color }}>{meta.short}</span>
        <span className="t">
          {(tag || node.kind === 'skill') && <span className={`tag${tag ? ' extra' : ''}`}>{tag ?? 'Skill'}</span>}
          <b>{node.name}</b>
          <span>{status}</span>
        </span>
        {goalMet(node.goal, values) ? <span className="tick" aria-label="Goal reached">✓</span>
          : logged >= node.goal.sets ? <span className="tick done" aria-label="Sets done">✓</span>
          : <span className="chev" aria-hidden="true">›</span>}
      </button>
    )
  }
  const anyLogged = progress.logs.some((l) => l.date === today)

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
      <AchievementCard />

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
              <button key={d} className="pillbtn" aria-label={`Train ${ANYWAY_LABEL[d]} Anyway`} onClick={() => setDayPick(d)}>
                Train {ANYWAY_LABEL[d]} Anyway
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {pick && (
            <button className="pillbtn" onClick={() => setDayPick(null)}>Back to {DAY_LABEL[progress.schedule[weekday]]}</button>
          )}
          <div className="hdr">Warm-up</div>
          <div className="group">
            {WARMUP[day].map((item) => {
              const key = `${day}:${item.name}`
              const on = warm.includes(key)
              return (
                <button key={key} className="check" role="checkbox" aria-checked={on} aria-label={item.name} onClick={() => toggleWarm(key)}>
                  <span className="box" aria-hidden="true">{on ? '✓' : ''}</span>
                  <span className="lbl">{item.name}</span>
                  <span className="amount">{item.amount}</span>
                </button>
              )
            })}
          </div>

          {workout.skill.length > 0 && (
            <>
              <div className="hdr">Skill</div>
              <div className="group">{workout.skill.map((n) => row(n))}</div>
            </>
          )}

          <div className="hdr">Strength</div>
          <div className="group">
            {workout.main.map(({ track, node }) => {
              const t = trackById(track)!
              return node ? row(node, t.name) : (
                <div className="row" key={track}>
                  <span className="dot" style={{ background: BRANCH_META[t.branch].color }}>{BRANCH_META[t.branch].short}</span>
                  <span className="t"><span className="tag extra">{t.name}</span><b>{BRANCH_META[t.branch].label}</b><span>Track complete</span></span>
                </div>
              )
            })}
          </div>
          {workout.extra.length > 0 && (
            <>
              <h2 className="hdr">Also Today</h2>
              <div className="group">{workout.extra.map((e) => row(e.node, e.role === 'volume' ? 'Volume' : 'Core finisher'))}</div>
            </>
          )}
          {workoutDone(workout, progress, today) && <div className="done-banner">Workout complete</div>}
          {anyLogged && <button className="cta" onClick={() => setFinishing(true)}>Finish Workout</button>}
        </>
      )}
      {finishing && <FinishSheet today={today} onClose={() => setFinishing(false)} />}
    </div>
  )
}
