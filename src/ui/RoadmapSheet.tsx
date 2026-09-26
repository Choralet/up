import { useState } from 'react'
import { formatStamp, videoUrl, type RoadmapItem } from '../data/roadmap'
import { MAX_ACTIVE_SKILLS } from '../engine/progress'
import { roadmapStatus } from '../engine/roadmap'
import { goalText } from '../lib/format'
import { useProgress } from '../store/ProgressContext'
import { ConfirmSheet } from './ConfirmSheet'

const LABEL = { done: 'Done', training: 'Training', ready: 'Ready', locked: 'Locked' } as const

export function RoadmapSheet({ item, onClose, onLog }: { item: RoadmapItem; onClose: () => void; onLog: (id: string) => void }) {
  const { byId, progress, activateSkill, setFocus, completeSteps } = useProgress()
  const [confirm, setConfirm] = useState(false)
  const s = roadmapStatus(byId, progress, item)
  const next = s.next
  const full = Object.keys(progress.skillFocus).length >= MAX_ACTIVE_SKILLS
  const completed = new Set(progress.completed)

  const train = () => {
    if (!next) return
    if (next.skill) activateSkill(next.skill)
    else setFocus(next.id)
    onClose()
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet roadmap-sheet" role="dialog" aria-modal="true" aria-label={item.name}>
        <div className="eyebrow">Year {item.year} · {LABEL[s.status]}</div>
        <h2>{item.name}</h2>
        {next && (
          <>
            <div className="hdr" style={{ margin: '12px 0 4px' }}>Needs</div>
            {next.requires.length === 0 && <div className="req">Nothing, start any time</div>}
            {next.requires.map((id) => {
              const ok = completed.has(id)
              return (
                <div className="req" key={id}>
                  <span className={ok ? 'ok' : 'nx'} aria-hidden="true">{ok ? '✓' : '…'}</span>
                  {byId.get(id)?.name ?? id}
                </div>
              )
            })}
          </>
        )}
        <div className="hdr" style={{ margin: '12px 0 4px' }}>Steps</div>
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
        {s.status === 'training' && next && (
          <button className="cta" onClick={() => { onLog(next.id); onClose() }}>Log This</button>
        )}
        {s.status === 'ready' && (
          <>
            <button className="cta" disabled={!!next?.skill && full} onClick={train}>{next?.skill ? 'Train This' : 'Make This My Focus'}</button>
            {next?.skill && full && <p className="sub">Two skills are already active. Stop one in My Skills first.</p>}
            <button className="cta sec" onClick={() => setConfirm(true)}>I Can Already Do This</button>
          </>
        )}
        <a className="cta sec videolink" href={videoUrl(item)} target="_blank" rel="noopener noreferrer">
          Watch in video ({formatStamp(item.t)})
        </a>
        <button className="cta sec" onClick={onClose}>Close</button>
      </div>
      {confirm && (
        <ConfirmSheet
          title={`Mark ${item.name} as done?`}
          message="Only if you can already do every step cleanly. You can still train it later from the tree or Skills."
          actions={[{ label: 'Mark Done', tone: 'primary', onClick: () => { completeSteps(item.steps); setConfirm(false) } }]}
          onCancel={() => setConfirm(false)}
        />
      )}
    </>
  )
}
