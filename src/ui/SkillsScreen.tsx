import { DAY_LABEL } from '../data/schedule'
import { SKILLS } from '../data/skills'
import { MAX_ACTIVE_SKILLS } from '../engine/progress'
import { skillStatus } from '../engine/skills'
import { goalText, plural } from '../lib/format'
import { useProgress } from '../store/ProgressContext'

export function SkillsScreen({ onLog }: { onLog: (nodeId: string) => void }) {
  const { nodes, byId, progress, activateSkill, deactivateSkill } = useProgress()
  const activeCount = Object.keys(progress.skillFocus).length
  const rows = SKILLS.map((chain) => ({ chain, s: skillStatus(nodes, progress, chain.id) }))
  const active = rows.filter((r) => r.s.status === 'active')
  const library = rows.filter((r) => r.s.status !== 'active')

  return (
    <div className="screen">
      <h1 className="large">Skills</h1>
      <div className="sub">Active skills train inside your daily plan. Up to {MAX_ACTIVE_SKILLS} at a time.</div>

      <div className="hdr">Active · {activeCount} of {MAX_ACTIVE_SKILLS}</div>
      <ul className="group list">
        {active.length === 0 && <li className="row"><span className="t"><span>No active skill yet. Start one below.</span></span></li>}
        {active.map(({ chain, s }) => {
          const step = s.currentId ? byId.get(s.currentId) : undefined
          return (
            <li className="row skillrow" key={chain.id}>
              <span className="t">
                <b>{chain.name}</b>
                <span>{DAY_LABEL[chain.day]} · step {Math.min(s.done + 1, s.total)} of {s.total}</span>
                {step ? (
                  <button className="linkbtn" onClick={() => onLog(step.id)}>
                    {step.name} · {goalText(step.goal)}
                  </button>
                ) : (
                  <span>No trainable step right now</span>
                )}
              </span>
              <button className="pillbtn" aria-label={`Stop ${chain.name}`} onClick={() => deactivateSkill(chain.id)}>Stop</button>
            </li>
          )
        })}
      </ul>

      <div className="hdr">Library</div>
      {activeCount >= MAX_ACTIVE_SKILLS && <p className="sub" style={{ margin: '12px 4px 0' }}>Stop an active skill to start another.</p>}
      <ul className="group list">
        {library.map(({ chain, s }) => (
          <li className="row skillrow" key={chain.id}>
            <span className="t">
              <b>{chain.name}</b>
              <span>
                {DAY_LABEL[chain.day]} · {s.done} of {plural(s.total, 'step')}
                {s.status === 'finished' && ' · Complete'}
                {s.status === 'locked' && ` · Needs: ${s.needs.join(', ')}`}
              </span>
            </span>
            {s.status !== 'finished' && (
              <button
                className="pillbtn"
                aria-label={`Start ${chain.name}`}
                disabled={s.status === 'locked' || activeCount >= MAX_ACTIVE_SKILLS}
                onClick={() => activateSkill(chain.id)}
              >
                Start
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
