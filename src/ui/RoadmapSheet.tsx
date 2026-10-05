import { useState } from 'react'
import { formatStamp, videoUrl, type RoadmapItem } from '../data/roadmap'
import { MAX_ACTIVE_SKILLS } from '../engine/progress'
import { roadmapStatus } from '../engine/roadmap'
import { gearText, goalText } from '../lib/format'
import { EQUIPMENT } from '../data/trees'
import { useProgress } from '../store/ProgressContext'
import { ConfirmSheet } from './ConfirmSheet'
import { GoalEditor } from './GoalEditor'
import { skillName } from '../data/names'
import { Icon } from './Icon'
import { accentStyle } from './branches'

const LABEL = { done: 'Done', training: 'Training', ready: 'Ready', locked: 'Locked' } as const

export function RoadmapSheet({ item, onClose, onLog }: { item: RoadmapItem; onClose: () => void; onLog: (id: string) => void }) {
  const { finalById, byId, nodes, passed, defaults, progress, activateSkill, deactivateSkill, setFocus, completeSteps, setGoal } = useProgress()
  const [confirm, setConfirm] = useState(false)
  const [editing, setEditing] = useState(false)
  const s = roadmapStatus(byId, progress, item, nodes)
  const next = s.next
  const full = Object.keys(progress.skillFocus).length >= MAX_ACTIVE_SKILLS
  const completed = new Set(progress.completed)
  const first = byId.get(item.steps[0])

  const train = () => {
    if (!next) return
    if (next.skill) activateSkill(next.skill)
    else setFocus(next.id)
    onClose()
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet roadmap-sheet" role="dialog" aria-modal="true" aria-label={item.name} style={accentStyle('skill')}>
        <div className="eyebrow accent">Year {item.year} · {LABEL[s.status]}</div>
        <h2>{item.name}</h2>
        {item.video && <div className="sub">In the video: {item.video}</div>}
        {first && (
          <>
            <div className="hdr inset">Needs</div>
            {/* the skill's real prerequisites (its first step's), never its own earlier steps */}
            <ul className="needs" aria-label="Needs">
              {first.requires.length === 0 && <li className="req">Nothing, start any time</li>}
              {first.requires.map((id) => {
                const ok = passed.has(id)
                return (
                  <li className="req" key={id}>
                    <span className={ok ? 'ok' : 'nx'} aria-hidden="true"><Icon name={ok ? 'check' : 'dots'} size={12} /></span>
                    {byId.get(id)?.name ?? id}
                  </li>
                )
              })}
            </ul>
          </>
        )}
        {s.status === 'locked' && s.gear.length > 0 && <p className="gearnote">Needs {gearText(s.gear, EQUIPMENT)}. Add it in Settings, My Equipment, when you have it.</p>}
        <div className="hdr inset">Steps</div>
        <ol className="steplist">
          {item.steps.map((id) => {
            const n = byId.get(id)!
            return (
              <li key={id} className={completed.has(id) ? 'stepdone' : ''}>
                <b>{n.name}</b> <span className="sub">{goalText(n.goal)}</span>
              </li>
            )
          })}
        </ol>
        {next && <p className="cue sub">{next.cue}</p>}
        {editing && next ? (
          <GoalEditor
            node={finalById.get(next.id) ?? next}
            def={defaults.get(next.id)!}
            onSave={(g) => { setGoal(next.id, g); setEditing(false) }}
            onReset={() => { setGoal(next.id, null); setEditing(false) }}
            onCancel={() => setEditing(false)}
          />
        ) : (
        <>
          {s.status === 'training' && next && (
            <button className="cta" onClick={() => { onLog(next.id); onClose() }}>Log This</button>
          )}
          {s.status === 'ready' && (
            <>
              {next?.skill && full ? (
                <>
                  <p className="sub">Two skills are active. Replace one to train this:</p>
                  {Object.keys(progress.skillFocus).map((id) => (
                    <button key={id} className="cta sec" onClick={() => { deactivateSkill(id); activateSkill(next.skill!); onClose() }}>
                      Replace {skillName(id, progress.skillFocus[id])}
                    </button>
                  ))}
                </>
              ) : (
                <button className="cta" onClick={train}>{next?.skill ? 'Train This' : 'Make This My Focus'}</button>
              )}
              <button className="cta sec" onClick={() => setConfirm(true)}>I Can Already Do This</button>
            </>
          )}
          {next && <button className="cta sec" onClick={() => setEditing(true)}>Edit Goal</button>}
          <a className="cta sec videolink" href={videoUrl(item)} target="_blank" rel="noopener noreferrer">
            Watch in Video ({formatStamp(item.t)})
          </a>
          <button className="cta sec" onClick={onClose}>Close</button>
        </>
        )}
      </div>
      {confirm && (
        <ConfirmSheet
          title={`Mark ${item.name} as done?`}
          message="Only if you can already do every step cleanly. This marks every step as finished and can't be undone (except by restoring an older backup)."
          actions={[{ label: 'Mark Done', tone: 'primary', onClick: () => { completeSteps(item.steps); setConfirm(false) } }]}
          onCancel={() => setConfirm(false)}
        />
      )}
    </>
  )
}
