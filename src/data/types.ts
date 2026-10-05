export type Branch = 'push' | 'pull' | 'legs' | 'core'
export type GoalType = 'reps' | 'hold'

export interface Goal {
  type: GoalType
  sets: number
  /** reps per set, or seconds per hold */
  target: number
  /** the target counts for each side, leg or arm */
  per?: 'side' | 'leg' | 'arm'
}

export interface HowToLink {
  label: string
  url: string
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
  /** new move from the Roadmap: not drawn in the tree, may require any branch */
  roadmapOnly?: boolean
  /** movement track (strength exercises only): the id of its tree, see src/data/trees.ts */
  track?: string
  /** the tree (ladder) it is drawn in; Roadmap-only moves have none */
  tree?: string
  /** ids of nodes that must be completed first (all of them) */
  requires: string[]
  goal: Goal
  cue: string
  /** equipment options: any one inner list, all of its items (none = floor only) */
  equipment?: string[][]
  muscles?: { primary: string[]; secondary: string[] }
  /** the source's rule for moving on, word for word */
  advance?: string
  /** key into SOURCES */
  source?: string
  links?: HowToLink[]
  /** the same exercise in other trees: finishing one finishes them all */
  twins?: string[]
}

export type DayType = 'push' | 'pull' | 'legs' | 'rest'

export interface SkillChain {
  id: string
  name: string
  /** day type whose workout trains this skill */
  day: Exclude<DayType, 'rest'>
  /** chain made only of Roadmap moves (listed via the Roadmap) */
  roadmapOnly?: boolean
}

export interface GoalOverride {
  sets: number
  target: number
}
