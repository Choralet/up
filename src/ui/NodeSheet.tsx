import { useState } from 'react'
import type { ExerciseNode } from '../data/types'
import { missingFor } from '../engine/equipment'
import { kitOf, nodeState } from '../engine/progress'
import { gearText, goalText } from '../lib/format'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META, nodeAccent } from './branches'
import { DemoButton } from './DemoButton'
import { GoalEditor } from './GoalEditor'
import { EQUIPMENT, SOURCES, treeById, youtubeSearch } from '../data/trees'
import { HistorySheet } from './HistorySheet'
import { skillName } from '../data/names'
import { Icon } from './Icon'

const LABEL = { locked: 'Locked', available: 'Ready', focus: 'Training', completed: 'Done', gear: 'Needs equipment' } as const

/** The exercise's details from the tree data: move-on rule, equipment, muscles, source, how-to links. */
function Details({ node }: { node: ExerciseNode }) {
  const tree = node.tree ? treeById(node.tree) : undefined
  const source = node.source ? SOURCES[node.source] : undefined
  const firstRung = tree?.category === 'skill' && node.requires.every((r) => !r.startsWith(`${tree.id}:`))
  const links = [...(node.links ?? []), ...(tree?.video ? [{ label: `${tree.video.label} (whole ladder)`, url: tree.video.url }] : [])]
  return (
    <div className="details">
      {firstRung && tree?.notes && (
        <>
          <div className="hdr inset">Before you start</div>
          <p>{tree.notes}</p>
        </>
      )}
      {node.advance && (
        <>
          <div className="hdr inset">Move on when</div>
          <p>{node.advance}</p>
        </>
      )}
      <div className="hdr inset">Equipment</div>
      <p>{node.equipment ? node.equipment.map((opt) => gearText(opt, EQUIPMENT)).join(' or ') : 'Floor only'}</p>
      {node.muscles && (
        <>
          <div className="hdr inset">Muscles</div>
          <p><b className="ink">{node.muscles.primary.join(', ')}</b>{node.muscles.secondary.length > 0 && <> · also {node.muscles.secondary.join(', ')}</>}</p>
        </>
      )}
      {node.added && (
        <>
          <div className="hdr inset">Source</div>
          <p>Added by Up: not in your exercise data. It gives a band setup a way to keep training this pattern.</p>
        </>
      )}
      {source && (
        <>
          <div className="hdr inset">Source</div>
          <p>{source.url ? <a className="linkbtn inline" href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a> : source.title}</p>
        </>
      )}
      <div className="hdr inset">How-to</div>
      <ul className="links">
        {links.map((l) => (
          <li key={l.url}><a className="linkbtn" href={l.url} target="_blank" rel="noopener noreferrer">{l.label}</a></li>
        ))}
        <li><a className="linkbtn" href={youtubeSearch(node.name)} target="_blank" rel="noopener noreferrer">Search YouTube</a></li>
      </ul>
    </div>
  )
}

export function NodeSheet({ node, onClose, onLog }: { node: ExerciseNode; onClose: () => void; onLog: (id: string) => void }) {
  const { finalById, progress, passed, byId, defaults, setFocus, activateSkill, deactivateSkill, setGoal } = useProgress()
  const [editing, setEditing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const state = nodeState(node, progress, passed)
  const tree = node.tree ? treeById(node.tree) : undefined
  const chainActive = node.skill ? node.skill in progress.skillFocus : false
  const slotsFull = Object.keys(progress.skillFocus).length >= 2
  const missing = missingFor(node, kitOf(progress))

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={node.name} style={nodeAccent(node)}>
        <div className="eyebrow accent">{tree?.name ?? BRANCH_META[node.branch].label} · {LABEL[state]}</div>
        <h2>{node.name}</h2>
        <div className="pills">
          <span className="pill">Goal {goalText(node.goal)}</span>
          {node.kind === 'skill' && <span className="pill skill">Skill</span>}
          <DemoButton node={node} />
          <button className="howto histbtn" onClick={() => setShowHistory(true)}>History</button>
        </div>
        {missing.length > 0 && state !== 'completed' && (
          <p className="gearnote">Needs {gearText(missing, EQUIPMENT)}. Add it in Settings, My Equipment, when you have it.</p>
        )}
        {node.requires.map((id) => {
          const ok = passed.has(id)
          return (
            <div className="req" key={id}>
              <span className={ok ? 'ok' : 'nx'} aria-hidden="true"><Icon name={ok ? 'check' : 'dots'} size={12} /></span>
              Requires {byId.get(id)?.name ?? id}{ok && !progress.completed.includes(id) ? ' (stepped over: no equipment)' : ''}
            </div>
          )
        })}
        <p className="cue">{node.cue}</p>
        {editing ? (
          <GoalEditor
            node={finalById.get(node.id) ?? node}
            def={defaults.get(node.id)!}
            onSave={(g) => { setGoal(node.id, g); setEditing(false) }}
            onReset={() => { setGoal(node.id, null); setEditing(false) }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            {state === 'available' && !node.skill && (
              <button className="cta" onClick={() => { setFocus(node.id); onClose() }}>Make This My Focus</button>
            )}
            {state === 'available' && node.skill && !chainActive && !slotsFull && (
              <button className="cta" onClick={() => { activateSkill(node.skill!); onClose() }}>Train This Skill</button>
            )}
            {state === 'available' && node.skill && !chainActive && slotsFull && (
              <>
                <p className="sub">Two skills are active. Replace one to train this:</p>
                {Object.keys(progress.skillFocus).map((id) => (
                  <button key={id} className="cta sec" onClick={() => { deactivateSkill(id); activateSkill(node.skill!); onClose() }}>
                    Replace {skillName(id, progress.skillFocus[id])}
                  </button>
                ))}
              </>
            )}
            {state === 'focus' && (
              <button className="cta" onClick={() => { onLog(node.id); onClose() }}>Log This Exercise</button>
            )}
            {state !== 'completed' && (
              <button className="cta sec" onClick={() => setEditing(true)}>Edit Goal</button>
            )}
            <button className="cta sec" onClick={onClose}>Close</button>
          </>
        )}
        <Details node={node} />
      </div>
      {showHistory && <HistorySheet node={node} onClose={() => setShowHistory(false)} />}
    </>
  )
}
