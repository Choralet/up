import { DAY_LABEL, WEEKDAYS } from '../data/schedule'
import { nextTrainingDay, sessionSummary } from '../engine/workout'
import { plural } from '../lib/format'
import { weekdayIndex } from '../lib/time'
import { useProgress } from '../store/ProgressContext'

/** A short, quiet summary of today's session. */
export function FinishSheet({ today, onClose }: { today: string; onClose: () => void }) {
  const { byId, progress } = useProgress()
  const lines = sessionSummary(byId, progress, today)
  const weekday = weekdayIndex(new Date())
  const next = nextTrainingDay(progress.schedule, weekday)
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Workout summary">
        <h3>Nice work</h3>
        <p>{plural(lines.length, 'exercise')} · {plural(lines.reduce((n, l) => n + l.sets, 0), 'set')}</p>
        <ul className="summary">
          {lines.map((l) => (
            <li key={l.node.id}>
              <b>{l.node.name}</b>
              <span className="sub">{plural(l.sets, 'set')} · best {l.best}{l.node.goal.type === 'hold' ? ' s' : ''}</span>
              {l.newBest && <span className="newbest">New best</span>}
            </li>
          ))}
        </ul>
        {next && <p className="sub">Next: {WEEKDAYS[(weekday + next.daysAhead) % 7]} · {DAY_LABEL[next.day]}</p>}
        <button className="cta" onClick={onClose}>Done</button>
      </div>
    </>
  )
}
