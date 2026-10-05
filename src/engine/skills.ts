import type { ExerciseNode } from '../data/types'
import { canDo, missingFor } from './equipment'
import { indexNodes } from './graph'
import { firstStep, isUnlocked, kitOf, passedFor, type Progress } from './progress'

export interface SkillStatus {
  status: 'active' | 'finished' | 'available' | 'locked'
  done: number
  total: number
  currentId: string | null
  /** names of the unmet requirements of the first unfinished step (for the locked message) */
  needs: string[]
  /** equipment codes the first step you can't start needs (locked by equipment) */
  gear: string[]
}

export function skillStatus(nodes: ExerciseNode[], progress: Progress, chainId: string): SkillStatus {
  const steps = nodes.filter((n) => n.skill === chainId)
  const completed = new Set(progress.completed)
  const passed = passedFor(nodes, progress)
  const kit = kitOf(progress)
  const done = steps.filter((s) => completed.has(s.id)).length
  const first = steps.find((s) => !completed.has(s.id))
  const byId = indexNodes(nodes)
  const trainable = firstStep(nodes, passed, chainId)
  // what stops you: the first step not done that you can't do or that is still locked
  const blocker = trainable ? undefined : steps.find((s) => !completed.has(s.id) && (!canDo(s, kit) || !isUnlocked(s, passed)))
  const needs = blocker ? blocker.requires.filter((r) => !passed.has(r)).map((r) => byId.get(r)?.name ?? r) : []
  const gear = blocker ? missingFor(blocker, kit) : []
  const base = { done, total: steps.length, needs, gear }
  if (chainId in progress.skillFocus) return { ...base, status: 'active', currentId: progress.skillFocus[chainId] }
  if (!first) return { ...base, status: 'finished', currentId: null }
  return { ...base, status: trainable ? 'available' : 'locked', currentId: null }
}
