import { BRANCHES } from '../engine/graph'
import { branchProgress, personalBests, streakDaysNeeded, weeklyStreak } from '../engine/stats'
import { goalText, plural } from '../lib/format'
import { localDate } from '../lib/time'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META } from './branches'
import { Ring } from './Ring'

export function ProgressScreen() {
  const { nodes, byId, progress } = useProgress()
  const streak = weeklyStreak(progress.logs, progress.schedule, localDate())
  const bests = personalBests(progress.logs, byId, 5)

  return (
    <div className="screen">
      <h1 className="large">Progress</h1>
      <div className="card" style={{ marginTop: 12 }}>
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

      <div className="hdr">Personal bests</div>
      <div className="group">
        {bests.length === 0 && <div className="row"><span className="t"><span>Log a set to see your bests here.</span></span></div>}
        {bests.map(({ node, best }) => (
          <div className="row" key={node.id}>
            <span className="t"><b>{node.name}</b><span>Goal {goalText(node.goal)}</span></span>
            <span className="sub">{best}{node.goal.type === 'hold' ? ' s' : ' reps'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
