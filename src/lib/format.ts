import type { Goal } from '../data/types'

export function goalText(goal: Goal): string {
  return goal.type === 'hold' ? `${goal.sets} × ${goal.target} s` : `${goal.sets} × ${goal.target}`
}
