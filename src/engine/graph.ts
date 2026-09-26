import type { Branch, ExerciseNode } from '../data/types'

export const BRANCHES: Branch[] = ['push', 'pull', 'legs', 'core']

export function indexNodes(nodes: ExerciseNode[]): Map<string, ExerciseNode> {
  return new Map(nodes.map((n) => [n.id, n]))
}

/** The beginner node of a branch: the strength exercise with no requirements (skill steps, e.g. Roadmap stretches, never count). */
export function rootOf(nodes: ExerciseNode[], branch: Branch): ExerciseNode | undefined {
  return nodes.find((n) => n.branch === branch && n.requires.length === 0 && !n.skill)
}
