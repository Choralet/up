import { DAY_LABEL, WEEKDAYS } from '../data/schedule'
import { nextTrainingDay, sessionSummary } from '../engine/workout'
import { plural } from '../lib/format'
import { weekdayIndex } from '../lib/time'
import { useProgress } from '../store/ProgressContext'
import { sessionMinutes } from '../engine/stats'
import { useCountUp } from '../lib/useCountUp'

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
        <Totals exercises={lines.length} sets={lines.reduce((n, l) => n + l.sets, 0)} minutes={sessionMinutes(progress.logs, today)} />
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

function Total({ value, label }: { value: number; label: string }) {
  const shown = useCountUp(value)
  return (
    <div className="total">
      <b aria-hidden="true">{shown}</b>
      <span aria-hidden="true">{label}</span>
    </div>
  )
}

/** Big totals that count up; screen readers get the plain sentence. */
function Totals({ exercises, sets, minutes }: { exercises: number; sets: number; minutes: number }) {
  return (
    <>
      <div className="totals">
        <Total value={exercises} label={exercises === 1 ? 'Exercise' : 'Exercises'} />
        <Total value={sets} label={sets === 1 ? 'Set' : 'Sets'} />
        {minutes > 0 && <Total value={minutes} label="Min" />}
      </div>
      <p className="sr-only">{plural(exercises, 'exercise')} · {plural(sets, 'set')}{minutes > 0 ? ` · ${minutes} min` : ''}</p>
    </>
  )
}
