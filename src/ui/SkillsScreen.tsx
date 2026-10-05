import { useState } from 'react'
import { skillName } from '../data/names'
import { ROADMAP } from '../data/roadmap'
import { DAY_LABEL } from '../data/schedule'
import { SKILLS } from '../data/skills'
import type { SplitDay } from '../data/types'
import { firstStep, MAX_ACTIVE_SKILLS } from '../engine/progress'
import { skillStatus } from '../engine/skills'
import { goalText, plural } from '../lib/format'
import { useProgress } from '../store/ProgressContext'
import { ConfirmSheet } from './ConfirmSheet'
import { RoadmapView } from './RoadmapView'
import { accentStyle } from './branches'

export type SkillsView = 'now' | 'roadmap'

const roadmapOrder = (stepId: string) => {
  const i = ROADMAP.findIndex((r) => r.steps.includes(stepId))
  return i < 0 ? ROADMAP.length : i
}

export function SkillsScreen({ onLog, view, onView }: { onLog: (nodeId: string) => void; view: SkillsView; onView: (v: SkillsView) => void }) {
  const { nodes, byId, progress, passed, activateSkill, deactivateSkill } = useProgress()
  const [replacing, setReplacing] = useState<{ chain: string; name: string } | null>(null)
  const activeIds = Object.keys(progress.skillFocus)
  const full = activeIds.length >= MAX_ACTIVE_SKILLS
  const when = (day: SplitDay) => (progress.settings.plan === 'full' ? 'Every session' : DAY_LABEL[day])

  const ready = SKILLS.filter((c) => skillStatus(nodes, progress, c.id).status === 'available')
    .map((chain) => {
      const step = byId.get(firstStep(nodes, passed, chain.id, progress.settings.equipment)!)!
      return { chain, step, name: skillName(chain.id, step.id), steps: nodes.filter((n) => n.skill === chain.id).length }
    })
    .sort((a, b) => roadmapOrder(a.step.id) - roadmapOrder(b.step.id))

  return (
    <div className="screen" style={accentStyle('skill')}>
      <h1 className="large">Skills</h1>
      <div className="seg" role="tablist" aria-label="Skills view">
        <button role="tab" aria-selected={view === 'now'} className={view === 'now' ? 'on' : ''} onClick={() => onView('now')}>Now</button>
        <button role="tab" aria-selected={view === 'roadmap'} className={view === 'roadmap' ? 'on' : ''} onClick={() => onView('roadmap')}>Roadmap</button>
      </div>
      {view === 'roadmap' ? (
        <RoadmapView onLog={onLog} />
      ) : (
        <>
          <div className="sub">Train up to {MAX_ACTIVE_SKILLS} skills alongside your workouts. {progress.settings.plan === 'full' ? 'They open every session, while you are fresh.' : 'They show up on their day.'}</div>

          <div className="hdr">Training · {activeIds.length} of {MAX_ACTIVE_SKILLS}</div>
          <ul className="group list">
            {activeIds.length === 0 && <li className="row"><span className="t"><span>No skill yet. Start one below.</span></span></li>}
            {SKILLS.filter((c) => c.id in progress.skillFocus).map((chain) => {
              const s = skillStatus(nodes, progress, chain.id)
              const step = s.currentId ? byId.get(s.currentId) : undefined
              const name = skillName(chain.id, s.currentId)
              return (
                <li className="row skillrow" key={chain.id}>
                  <span className="t">
                    <b>{name}</b>
                    <span>{when(chain.day)} · step {Math.min(s.done + 1, s.total)} of {s.total}</span>
                    {step ? (
                      <button className="linkbtn" onClick={() => onLog(step.id)}>{step.name} · {goalText(step.goal)}</button>
                    ) : (
                      <span>Waiting for a main exercise to unlock the next step</span>
                    )}
                  </span>
                  <button className="pillbtn" aria-label={`Stop ${name}`} onClick={() => deactivateSkill(chain.id)}>Stop</button>
                </li>
              )
            })}
          </ul>

          <div className="hdr">Ready to Start</div>
          {full && ready.length > 0 && <p className="note">Both skill slots are in use. Replace one to start another.</p>}
          <ul className="group list">
            {ready.length === 0 && (
              <li className="row"><span className="t"><span>Nothing ready yet. Keep training your main exercises to unlock skills.</span></span></li>
            )}
            {ready.map(({ chain, step, name, steps }) => (
              <li className="row skillrow" key={chain.id}>
                <span className="t">
                  <b>{name}</b>
                  <span>{when(chain.day)} · {plural(steps, 'step')} · first: {step.name}, {goalText(step.goal)}</span>
                </span>
                {full ? (
                  <button className="pillbtn" aria-label={`Replace for ${name}`} onClick={() => setReplacing({ chain: chain.id, name })}>Replace</button>
                ) : (
                  <button className="pillbtn" aria-label={`Start ${name}`} onClick={() => activateSkill(chain.id)}>Start</button>
                )}
              </li>
            ))}
          </ul>
          <p className="note">
            Locked skills are in the Roadmap, with what each one needs.{' '}
            <button className="linkbtn inline" onClick={() => onView('roadmap')}>Open Roadmap</button>
          </p>
        </>
      )}
      {replacing && (
        <ConfirmSheet
          title={`Start ${replacing.name} instead of…`}
          actions={activeIds.map((id) => {
            const name = skillName(id, progress.skillFocus[id])
            return { label: `Replace ${name}`, onClick: () => { deactivateSkill(id); activateSkill(replacing.chain); setReplacing(null) } }
          })}
          onCancel={() => setReplacing(null)}
        />
      )}
    </div>
  )
}
