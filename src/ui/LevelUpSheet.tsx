import { useState } from 'react'
import type { ExerciseNode } from '../data/types'
import type { Suggestion } from '../engine/progress'
import { goalText } from '../lib/format'
import { ROADMAP } from '../data/roadmap'
import { SKILLS } from '../data/skills'
import { nodeAccent } from './branches'
import { Icon } from './Icon'

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

  return (
    <>
      <div className="scrim" onClick={onDismiss} />
      <div className="sheet center" role="dialog" aria-modal="true" aria-label="Level up" style={nodeAccent(node)}>
        <div className="medal" aria-hidden="true"><Icon name="check" size={34} /></div>
        <h3>You hit {goalText(node.goal)}</h3>
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
