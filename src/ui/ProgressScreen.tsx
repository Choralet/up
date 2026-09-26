import { BRANCHES } from '../engine/graph'
import { branchProgress, personalBests, recentSessions, streakDaysNeeded, weekStrip, weeklyGain, weeklyStreak } from '../engine/stats'
import { DAY_LABEL } from '../data/schedule'
import { goalText, plural } from '../lib/format'
import { localDate } from '../lib/time'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META } from './branches'
import { Ring } from './Ring'

export function ProgressScreen() {
  const { nodes, byId, progress } = useProgress()
  const today = localDate()
  const streak = weeklyStreak(progress.logs, progress.schedule, today)
  const strip = weekStrip(progress.logs, progress.schedule, today)
  const planned = strip.filter((d) => d.planned !== 'rest').length
  const trainedDays = strip.filter((d) => d.trained).length
  const sessions = recentSessions(progress.logs, 5)
  const dayName = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  const bests = personalBests(progress.logs, byId, 5)

  return (
    <div className="screen">
      <h1 className="large">Progress</h1>
      <div className="card" style={{ marginTop: 12 }}>
        <b>{trainedDays > planned ? `${trainedDays} days this week · ${planned} planned` : `${trainedDays} of ${planned} days this week`}</b>
        <ul className="weekstrip" aria-label="This week">
          {strip.map((d) => (
            <li key={d.date} className={`${d.trained ? 'trained' : d.planned !== 'rest' ? 'planned' : 'rest'}${d.isToday ? ' today' : ''}`}
              aria-label={`${new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long' })}: ${d.trained ? 'trained' : d.planned === 'rest' ? 'rest' : d.date < today ? `${DAY_LABEL[d.planned]}, missed` : `${DAY_LABEL[d.planned]}, not yet`}`}>
              <span className="wsdot" aria-hidden="true" />
              <span className="wslabel" aria-hidden="true">{'MTWTFSS'[strip.indexOf(d)]}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="card">
        <b>{streak > 0 ? `${streak} week streak` : 'No streak yet'}</b>
        <div className="sub" style={{ marginTop: 4 }}>
          {`Train on ${plural(streakDaysNeeded(progress.schedule), 'day')} in a week to keep it going.`} Rest weeks are fine, and an unfinished week never breaks it.
        </div>
      </div>

      <div className="rings">
        {BRANCHES.map((b) => {
          const { done, total } = branchProgress(nodes, progress, b)
          return (
            <div className="ringcard" key={b}>
              <Ring value={total ? done / total : 0} color={BRANCH_META[b].color} label={`${BRANCH_META[b].label}: ${done} of ${total} steps`} />
              <b>{BRANCH_META[b].label}</b>
              <span className="sub">{done} of {plural(total, 'step')}</span>
            </div>
          )
        })}
      </div>

      <div className="hdr">Recent sessions</div>
      <ul className="group list" aria-label="Recent sessions">
        {sessions.length === 0 && <li className="row"><span className="t"><span>Your workouts will show here.</span></span></li>}
        {sessions.map((x) => (
          <li className="row" key={x.date}>
            <span className="t"><b>{dayName(x.date)}</b><span>{plural(x.exercises, 'exercise')} · {plural(x.sets, 'set')}</span></span>
          </li>
        ))}
      </ul>

      <div className="hdr">Personal bests</div>
      <div className="group">
        {bests.length === 0 && <div className="row"><span className="t"><span>Log a set to see your bests here.</span></span></div>}
        {bests.map(({ node, best }) => (
          <div className="row" key={node.id}>
            <span className="t"><b>{node.name}</b><span>Goal {goalText(node.goal)}</span></span>
            <span className="sub">
              {best}{node.goal.type === 'hold' ? ' s' : ' reps'}
              {weeklyGain(progress.logs, node.id, today) !== null && <span className="gain"> · +{weeklyGain(progress.logs, node.id, today)}{node.goal.type === 'hold' ? ' s' : ''} vs last week</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
