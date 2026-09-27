import type { RoadmapItem } from '../data/roadmap'
import type { ExerciseNode } from '../data/types'
import { isUnlocked, trackOf, type Progress } from './progress'

export interface RoadmapStatus {
  status: 'done' | 'training' | 'ready' | 'locked'
  /** the item's first unfinished step */
  next: ExerciseNode | null
  /** names of next's unmet requirements (locked only) */
  needs: string[]
  /** steps of this item already completed */
  done: number
}

export function roadmapStatus(byId: Map<string, ExerciseNode>, progress: Progress, item: RoadmapItem): RoadmapStatus {
  const completed = new Set(progress.completed)
  const steps = item.steps.map((id) => byId.get(id)).filter((n): n is ExerciseNode => !!n)
  const done = steps.filter((s) => completed.has(s.id)).length
  const next = steps.find((s) => !completed.has(s.id)) ?? null
  if (!next) return { status: 'done', next: null, needs: [], done }
  const training = next.skill ? progress.skillFocus[next.skill] === next.id : progress.focus[trackOf(next)] === next.id
  if (training) return { status: 'training', next, needs: [], done }
  if (isUnlocked(next, completed)) return { status: 'ready', next, needs: [], done }
  const needs = next.requires.filter((r) => !completed.has(r)).map((r) => byId.get(r)?.name ?? r)
  return { status: 'locked', next, needs, done }
}
