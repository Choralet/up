export type Branch = 'push' | 'pull' | 'legs' | 'core'
export type GoalType = 'reps' | 'hold'

export interface Goal {
  type: GoalType
  sets: number
  /** reps per set, or seconds per hold */
  target: number
}

export interface ExerciseNode {
  id: string
  name: string
  /** shorter label for the tree drawing, only when `name` does not fit */
  short?: string
  branch: Branch
  kind: 'strength' | 'skill'
  /** skill chain this step belongs to; only skill steps have one */
  skill?: string
  /** ids of nodes that must be completed first (all of them) */
  requires: string[]
  /** column 0..3 in the tree drawing */
  col: number
  goal: Goal
  cue: string
}

export type DayType = 'push' | 'pull' | 'legs' | 'rest'

export interface SkillChain {
  id: string
  name: string
  /** day type whose workout trains this skill */
  day: Exclude<DayType, 'rest'>
}

export interface GoalOverride {
  sets: number
  target: number
}
