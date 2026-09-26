import { useState } from 'react'
import type { ExerciseNode, GoalOverride } from '../data/types'

interface Props {
  node: ExerciseNode
  def: ExerciseNode
  onSave: (goal: GoalOverride) => void
  onReset: () => void
  onCancel: () => void
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export function GoalEditor({ node, def, onSave, onReset, onCancel }: Props) {
  const [sets, setSets] = useState(node.goal.sets)
  const [target, setTarget] = useState(node.goal.target)
  const unit = node.goal.type === 'hold' ? 'seconds per hold' : 'reps per set'
  const changed = node.goal.sets !== def.goal.sets || node.goal.target !== def.goal.target

  return (
    <div className="goaled">
      <p className="sub" style={{ margin: '4px 0' }}>Default: {def.goal.sets} sets × {def.goal.target} {unit}</p>
      <div className="field">
        <span>Sets</span>
        <span className="steps">
          <button aria-label="Decrease sets" onClick={() => setSets((v) => clamp(v - 1, 1, 10))}>−</button>
          <b>{sets}</b>
          <button aria-label="Increase sets" onClick={() => setSets((v) => clamp(v + 1, 1, 10))}>+</button>
        </span>
      </div>
      <div className="field">
        <span>{node.goal.type === 'hold' ? 'Seconds' : 'Reps'}</span>
        <span className="steps">
          <button aria-label="Decrease target" onClick={() => setTarget((v) => clamp(v - 1, 1, 999))}>−</button>
          <b>{target}</b>
          <button aria-label="Increase target" onClick={() => setTarget((v) => clamp(v + 1, 1, 999))}>+</button>
        </span>
      </div>
      <button className="cta" onClick={() => onSave({ sets, target })}>Save Goal</button>
      {changed && <button className="cta sec" onClick={onReset}>Reset to Default</button>}
      <button className="cta sec" onClick={onCancel}>Cancel</button>
    </div>
  )
}
