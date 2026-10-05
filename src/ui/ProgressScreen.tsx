import { BRANCHES } from '../engine/graph'
import { branchLevel, personalBests, recentSessions, streakDaysNeeded, weekStrip, weeklyGain, weeklyStreak } from '../engine/stats'
import { DAY_LABEL } from '../data/schedule'
import { achievements } from '../engine/achievements'
import { goalText, plural } from '../lib/format'
import { localDate } from '../lib/time'
import { useProgress } from '../store/ProgressContext'
import { accentStyle, BRANCH_META } from './branches'
import { LevelBadge, XpBar } from './Level'
import { Icon } from './Icon'

export function ProgressScreen() {
  const { nodes, byId, progress } = useProgress()
  const today = localDate()
  const streak = weeklyStreak(progress.logs, progress.schedule, today)
  const strip = weekStrip(progress.logs, progress.schedule, today)
  const planned = strip.filter((d) => d.planned !== 'rest').length
  const trainedDays = strip.filter((d) => d.trained).length
  const sessions = recentSessions(progress.logs, 5)
  const achs = achievements(nodes, progress, today)
  const dayName = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  const bests = personalBests(progress.logs, byId, 5)

  return (
    <div className="screen">
      <h1 className="large">Progress</h1>
      <div className="card">
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
        <div className="sub">
          {`Train on ${plural(streakDaysNeeded(progress.schedule), 'day')} in a week to keep it going.`} A week with fewer days starts it again; the week you're in never breaks it.
        </div>
      </div>

      <div className="levels">
        {BRANCHES.map((b) => {
          const l = branchLevel(nodes, progress, b)
          return (
            <div className="lvcard" key={b} style={accentStyle(b)}>
              <LevelBadge branch={b} level={l.level} />
              <b>{BRANCH_META[b].label}</b>
              <XpBar ratio={l.ratio} label={`${BRANCH_META[b].label}: ${l.done} of ${l.total} steps`} />
              <span className="sub">{l.done} of {plural(l.total, 'step')}</span>
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

      <h2 className="hdr">Achievements · {achs.filter((a) => a.earned).length} of {achs.length}</h2>
      <ul className="achgrid" aria-label="Achievements">
        {achs.map((a) => (
          <li key={a.id} className={a.earned ? 'earned' : ''} aria-label={`${a.name}, ${a.earned ? 'earned' : 'not yet'}: ${a.detail}`}>
            <span className="achmedal" aria-hidden="true"><Icon name="star" size={22} /></span>
            <b>{a.name}</b>
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
