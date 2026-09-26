import type { ExerciseNode } from '../data/types'
import { indexNodes } from './graph'
import { firstStep, type Progress } from './progress'

export interface SkillStatus {
  status: 'active' | 'finished' | 'available' | 'locked'
  done: number
  total: number
  currentId: string | null
  /** names of the unmet requirements of the first unfinished step (for the locked message) */
  needs: string[]
}

export function skillStatus(nodes: ExerciseNode[], progress: Progress, chainId: string): SkillStatus {
  const steps = nodes.filter((n) => n.skill === chainId)
  const doneSet = new Set(progress.completed)
  const done = steps.filter((s) => doneSet.has(s.id)).length
  const first = steps.find((s) => !doneSet.has(s.id))
  const byId = indexNodes(nodes)
  const needs = first && firstStep(nodes, doneSet, chainId) === null
    ? first.requires.filter((r) => !doneSet.has(r)).map((r) => byId.get(r)?.name ?? r)
    : []
  const base = { done, total: steps.length, needs }
  if (chainId in progress.skillFocus) return { ...base, status: 'active', currentId: progress.skillFocus[chainId] }
  if (!first) return { ...base, status: 'finished', currentId: null }
  return { ...base, status: needs.length === 0 ? 'available' : 'locked', currentId: null }
}
