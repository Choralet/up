import { useState, type CSSProperties } from 'react'
import type { ExerciseNode } from '../data/types'
import type { Suggestion } from '../engine/progress'
import { goalText } from '../lib/format'
import { BRANCH_META } from './branches'

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

  return (
    <>
      <div className="scrim" onClick={onDismiss} />
      <div className="sheet center" role="dialog" aria-modal="true" aria-label="Level up" style={{ '--accent': BRANCH_META[node.branch].color } as CSSProperties}>
        <div className="medal" aria-hidden="true">✓</div>
        <h3>You hit {goalText(node.goal)}</h3>
        <p>{node.name} complete.{hasChoices ? ' Choose your next focus.' : ' You have finished everything unlocked here.'}</p>
        {suggestions.map((s, i) => (
          <button key={s.node.id} className="choice" aria-pressed={choice === s.node.id} onClick={() => setChoice(s.node.id)}>
            <span>
              <b>{s.node.name}</b>
              <span>{s.isNew ? 'New' : 'Unlocked'} · {s.node.kind === 'skill' ? 'Skill · ' : ''}{goalText(s.node.goal)}</span>
            </span>
            {i === 0 && <em>Suggested</em>}
          </button>
        ))}
        {unlockedSkills.length > 0 && (
          <p className="sub">
            Unlocks {unlockedSkills.length === 1 ? 'a skill' : `${unlockedSkills.length} skills`}: {unlockedSkills.slice(0, 3).map((n) => n.name).join(', ')}
            {unlockedSkills.length > 3 ? ' and more' : ''}. Find {unlockedSkills.length === 1 ? 'it' : 'them'} in Skills.
          </p>
        )}
        <button className="cta" style={{ background: 'var(--accent)' }} onClick={() => onPick(choice)}>
          {hasChoices ? 'Set Focus' : 'Complete'}
        </button>
        <button className="cta sec" onClick={onDismiss}>Not yet</button>
      </div>
    </>
  )
}
