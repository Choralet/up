import type { Branch, ExerciseNode } from '../data/types'
import { indexNodes } from './graph'

export const COL_W = 66
export const ROW_H = 78
export const PAD_X = 42
export const PAD_Y = 28
export const NODE_R = 17
export const COLS = 4

export interface Placed {
  node: ExerciseNode
  x: number
  y: number
  depth: number
}

export interface TreeLayout {
  placed: Placed[]
  edges: { from: string; to: string }[]
  width: number
  height: number
}

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

export function layoutBranch(nodes: ExerciseNode[], branch: Branch): TreeLayout {
  const depths = computeDepths(nodes)
  const inBranch = nodes.filter((n) => n.branch === branch && !n.roadmapOnly)
  const maxDepth = Math.max(0, ...inBranch.map((n) => depths.get(n.id)!))
  const placed = inBranch.map((node) => {
    const depth = depths.get(node.id)!
    return { node, depth, x: PAD_X + node.col * COL_W, y: PAD_Y + (maxDepth - depth) * ROW_H }
  })
  const edges = inBranch.flatMap((n) => n.requires.map((r) => ({ from: r, to: n.id })))
  return {
    placed,
    edges,
    width: PAD_X * 2 + (COLS - 1) * COL_W,
    height: PAD_Y * 2 + maxDepth * ROW_H + 22,
  }
}
