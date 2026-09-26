import type { ExerciseNode } from '../data/types'
import { indexNodes } from './graph'

/** Depth = longest chain of requirements below a node (roots are 0). Throws on unknown ids or cycles. */
export function computeDepths(nodes: ExerciseNode[]): Map<string, number> {
  const byId = indexNodes(nodes)
  const memo = new Map<string, number>()
  const visit = (id: string, path: string[]): number => {
    const cached = memo.get(id)
    if (cached !== undefined) return cached
    if (path.includes(id)) throw new Error(`Cycle in exercise graph at ${id}`)
    const node = byId.get(id)
    if (!node) throw new Error(`Unknown node ${id}`)
    const depth = node.requires.length === 0 ? 0 : 1 + Math.max(...node.requires.map((r) => visit(r, [...path, id])))
    memo.set(id, depth)
    return depth
  }
  for (const n of nodes) visit(n.id, [])
  return memo
}
