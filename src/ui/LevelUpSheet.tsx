import { useState, type CSSProperties } from 'react'
import type { ExerciseNode } from '../data/types'
import type { Suggestion } from '../engine/progress'
import { goalText } from '../lib/format'
import { ROADMAP } from '../data/roadmap'
import { SKILLS } from '../data/skills'
import { afterLevel, branchLevel } from '../engine/stats'
import { useProgress } from '../store/ProgressContext'
import { BRANCH_META, nodeAccent } from './branches'
import { LevelBadge, XpBar } from './Level'

/** Name what a level-up unlocks the way the Skills tab shows it: Roadmap skill names first, else the skill chain name. */
function unlockNames(nodes: ExerciseNode[]): { roadmap: string[]; mine: string[] } {
  const roadmap = new Set<string>()
  const mine = new Set<string>()
  for (const n of nodes) {
    const item = ROADMAP.find((r) => r.steps.includes(n.id))
    if (item) roadmap.add(item.name)
    else mine.add(SKILLS.find((c) => c.id === n.skill)?.name ?? n.name)
  }
  return { roadmap: [...roadmap], mine: [...mine] }
}

interface Props {
  node: ExerciseNode
  suggestions: Suggestion[]
  unlockedSkills?: ExerciseNode[]
  onPick: (toId: string | null) => void
  onDismiss: () => void
}

export function LevelUpSheet({ node, suggestions, unlockedSkills = [], onPick, onDismiss }: Props) {
  const [choice, setChoice] = useState<string | null>(suggestions[0]?.node.id ?? null)
  const hasChoices = suggestions.length > 0
  const unlocks = unlockNames(unlockedSkills)
  const { nodes, progress } = useProgress()
  const before = branchLevel(nodes, progress, node.branch)
  const after = afterLevel(before)
  const branchName = BRANCH_META[node.branch].label

  return (
    <>
      <div className="scrim" onClick={onDismiss} />
      <div className="sheet center levelup" role="dialog" aria-modal="true" aria-label="Level up" style={nodeAccent(node)}>
        <div className="burst" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => <i key={i} style={{ '--i': i } as CSSProperties} />)}
          <LevelBadge branch={node.branch} level={after.level} size="lg" />
        </div>
        <div className="eyebrow accent">Level up · {branchName} level {after.level}</div>
        <h3>You hit {goalText(node.goal)}</h3>
        <XpBar ratio={after.ratio} from={before.ratio} label={`${branchName}: ${after.done} of ${after.total} steps`} />
        <p>{node.name} complete.{hasChoices ? ' Choose your next focus.' : ' You have finished everything unlocked here.'}</p>
        {suggestions.map((s, i) => (
          <button key={s.node.id} className="choice" aria-pressed={choice === s.node.id} onClick={() => setChoice(s.node.id)}>
            <span>
              <b>{s.node.name}</b>
              <span>{s.isNew ? 'New' : 'Ready'} · {s.node.kind === 'skill' ? 'Skill · ' : ''}{goalText(s.node.goal)}</span>
            </span>
            {i === 0 && <em>Suggested</em>}
          </button>
        ))}
        {unlocks.roadmap.length > 0 && <p className="sub">Unlocks in Roadmap: {unlocks.roadmap.join(', ')}.</p>}
        {unlocks.mine.length > 0 && <p className="sub">Unlocks in Skills: {unlocks.mine.join(', ')}.</p>}
        <button className="cta" onClick={() => onPick(choice)}>
          {hasChoices ? 'Level Up' : 'Complete'}
        </button>
        <button className="cta sec" onClick={onDismiss}>Not Yet</button>
      </div>
    </>
  )
}
