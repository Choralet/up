import type { ExerciseNode } from '../data/types'
import { indexNodes } from './graph'

export const COL_W = 66
export const ROW_H = 86
export const PAD_X = 42
export const PAD_Y = 28
export const NODE_R = 19

export interface Placed {
  node: ExerciseNode
  x: number
  y: number
  depth: number
  col: number
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

/**
 * One tree (ladder), beginner at the bottom. Columns come from the tree's shape: the longest path runs
 * straight up, side branches open to the right. Requirements from other trees (a ladder's gate) are not drawn.
 */
export function layoutTree(nodes: ExerciseNode[], treeId: string): TreeLayout {
  const inTree = nodes.filter((n) => n.tree === treeId && !n.roadmapOnly)
  const ids = new Set(inTree.map((n) => n.id))
  const parentOf = (n: ExerciseNode) => n.requires.find((r) => ids.has(r))
  const children = new Map<string, ExerciseNode[]>(inTree.map((n) => [n.id, []]))
  for (const n of inTree) {
    const p = parentOf(n)
    if (p) children.get(p)!.push(n)
  }
  const depth = new Map<string, number>()
  const setDepth = (n: ExerciseNode, d: number) => {
    depth.set(n.id, d)
    for (const c of children.get(n.id)!) setDepth(c, d + 1)
  }
  const roots = inTree.filter((n) => !parentOf(n))
  for (const r of roots) setDepth(r, 0)
  const height = (n: ExerciseNode): number => 1 + Math.max(0, ...children.get(n.id)!.map(height))

  // Packed columns: each exercise takes the leftmost free column at or right of its parent's, but never sits straight
  // above or below an exercise it isn't linked to (a vertical neighbour always reads as "builds on").
  const col = new Map<string, number>()
  const cell = new Map<string, ExerciseNode>()
  const key = (c: number, d: number) => `${c}:${d}`
  const fits = (n: ExerciseNode, c: number) => {
    const d = depth.get(n.id)!
    if (cell.has(key(c, d))) return false
    const below = cell.get(key(c, d - 1))
    const above = cell.get(key(c, d + 1))
    return (!below || below.id === parentOf(n)) && (!above || parentOf(above) === n.id)
  }
  const place = (n: ExerciseNode, from: number) => {
    let c = from
    while (!fits(n, c)) c++
    col.set(n.id, c)
    cell.set(key(c, depth.get(n.id)!), n)
  }
  // row by row from the bottom, each row left to right by parent; the longest path first among siblings,
  // so it runs straight up (data order breaks ties: the sort is stable)
  const kids = (n: ExerciseNode) => [...children.get(n.id)!].sort((a, b) => height(b) - height(a))
  for (let row = roots; row.length; row = row.flatMap(kids)) {
    for (const n of row) {
      const p = parentOf(n)
      place(n, p ? col.get(p)! : 0)
    }
  }
  const cols = 1 + Math.max(0, ...col.values())

  const maxDepth = Math.max(0, ...depth.values())
  const placed = inTree.map((node) => {
    const d = depth.get(node.id)!
    const c = col.get(node.id)!
    return { node, depth: d, col: c, x: PAD_X + c * COL_W, y: PAD_Y + (maxDepth - d) * ROW_H }
  })
  const edges = inTree.flatMap((n) => {
    const p = parentOf(n)
    return p ? [{ from: p, to: n.id }] : []
  })
  return { placed, edges, width: PAD_X * 2 + (cols - 1) * COL_W, height: PAD_Y * 2 + maxDepth * ROW_H + 22 }
}
