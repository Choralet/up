import { useMemo, useState } from 'react'
import { DAY_BRANCHES, DAY_LABEL, WARMUP, WEEKDAYS } from '../data/schedule'
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
import { BRANCH_META, accentStyle, nodeAccent } from './branches'
import { trackById } from '../data/tracks'
import { Icon, type IconName } from './Icon'
import { BranchLevel, Streak } from './Level'

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

  const quest = (node: ExerciseNode, tag?: string) => {
    const values = todaysValues(progress, node.id, today)
    const logged = values.length
    const met = goalMet(node.goal, values)
    const status = logged === 0
      ? goalText(node.goal)
      : `${goalText(node.goal)} · ${Math.min(logged, node.goal.sets)} of ${node.goal.sets} sets · best ${Math.max(...values)}${unit(node)}`
    const icon: IconName = met ? 'check' : node.kind === 'skill' ? 'bolt' : node.branch
    return (
      <button className={`quest${node.kind === 'skill' ? ' skill' : ''}`} key={`${tag ?? 'main'}:${node.id}`} style={nodeAccent(node)} onClick={() => onOpen(node.id)}>
        <span className="qicon" aria-hidden="true"><Icon name={icon} /></span>
        <span className="t">
          {(tag || node.kind === 'skill') && <span className={`tag${tag ? ' extra' : ''}`}>{tag ?? 'Skill'}</span>}
          <b>{node.name}</b>
          <span>{status}</span>
        </span>
        {met ? <span className="tick" role="img" aria-label="Goal reached"><Icon name="check" /></span>
          : logged >= node.goal.sets ? <span className="tick done" role="img" aria-label="Sets done"><Icon name="check" /></span>
          : <Icon name="chevron" className="chev" />}
      </button>
    )
  }
  const anyLogged = progress.logs.some((l) => l.date === today)

  return (
    <div className="screen">
      <div className="todaytop">
        {day !== 'rest' && DAY_BRANCHES[day].map((b) => <BranchLevel key={b} branch={b} />)}
        {day === 'rest' && <span className="spacer" />}
        <Streak />
      </div>
      <div className="head">
        <div>
          <div className="sub">{heading}</div>
          <h1 className="large">{DAY_LABEL[day]}</h1>
        </div>
        <button className="gear" aria-label="Settings" onClick={onSettings}><Icon name="gear" size={22} /></button>
      </div>
      <BackupNotice refresh={settingsOpen} onOpen={onSettings} />
      <AchievementCard />

      {day === 'rest' ? (
        <>
          <div className="card">
            <b>Recovery is part of the plan.</b>
            <div className="sub">
              {next ? `Next: ${WEEKDAYS[(weekday + next.daysAhead) % 7]} · ${DAY_LABEL[next.day]}` : 'No training days are scheduled. Set some in Settings.'}
            </div>
          </div>
          <div className="hdr">Feeling fresh?</div>
          <div className="stack">
            {TRAIN_ANYWAY.map((d) => (
              <button key={d} className="cta sec" style={accentStyle(DAY_BRANCHES[d][0])} aria-label={`Train ${ANYWAY_LABEL[d]} Anyway`} onClick={() => setDayPick(d)}>
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
                  <span className="box" aria-hidden="true">{on && <Icon name="check" size={14} />}</span>
                  <span className="lbl">{item.name}</span>
                  <span className="amount">{item.amount}</span>
                </button>
              )
            })}
          </div>

          {workout.skill.length > 0 && (
            <>
              <div className="hdr">Skill</div>
              <div className="quests">{workout.skill.map((n) => quest(n))}</div>
            </>
          )}

          <div className="hdr">Strength</div>
          <div className="quests">
            {workout.main.map(({ track, node }) => {
              const t = trackById(track)!
              return node ? quest(node, t.name) : (
                <div className="quest flat" key={track} style={accentStyle(t.branch)}>
                  <span className="qicon" aria-hidden="true"><Icon name="check" /></span>
                  <span className="t"><span className="tag extra">{t.name}</span><b>{BRANCH_META[t.branch].label}</b><span>Track complete</span></span>
                </div>
              )
            })}
          </div>
          {workout.extra.length > 0 && (
            <>
              <h2 className="hdr">Also Today</h2>
              <div className="quests">{workout.extra.map((e) => quest(e.node, e.role === 'volume' ? 'Volume' : 'Core finisher'))}</div>
            </>
          )}
          {workoutDone(workout, progress, today) && <div className="done-banner">Workout complete</div>}
          {anyLogged && <button className="cta" style={accentStyle(DAY_BRANCHES[day][0])} onClick={() => setFinishing(true)}>Finish Workout</button>}
        </>
      )}
      {finishing && <div className="contents" style={day !== 'rest' ? accentStyle(DAY_BRANCHES[day][0]) : undefined}><FinishSheet today={today} onClose={() => setFinishing(false)} /></div>}
    </div>
  )
}
