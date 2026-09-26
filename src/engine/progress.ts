import type { Branch, ExerciseNode, Goal } from '../data/types'
import { BRANCHES, indexNodes, rootOf } from './graph'

export type NodeState = 'locked' | 'available' | 'focus' | 'completed'

export interface SetLog {
  nodeId: string
  value: number
  /** local day, YYYY-MM-DD */
  date: string
  /** epoch ms */
  at: number
}

export interface Progress {
  completed: string[]
  focus: Record<Branch, string | null>
  logs: SetLog[]
}

export interface Suggestion {
  node: ExerciseNode
  isNew: boolean
}

export function initialProgress(nodes: ExerciseNode[]): Progress {
  const focus = {} as Record<Branch, string | null>
  for (const b of BRANCHES) focus[b] = rootOf(nodes, b)?.id ?? null
  return { completed: [], focus, logs: [] }
}

export function isUnlocked(node: ExerciseNode, completed: Set<string>): boolean {
  return node.requires.every((r) => completed.has(r))
}

export function nodeState(node: ExerciseNode, progress: Progress): NodeState {
  if (progress.completed.includes(node.id)) return 'completed'
  if (progress.focus[node.branch] === node.id) return 'focus'
  return isUnlocked(node, new Set(progress.completed)) ? 'available' : 'locked'
}

export function goalMet(goal: Goal, values: number[]): boolean {
  return values.filter((v) => v >= goal.target).length >= goal.sets
}

export function todaysValues(progress: Progress, nodeId: string, date: string): number[] {
  return progress.logs.filter((l) => l.nodeId === nodeId && l.date === date).map((l) => l.value)
}

export function logSet(progress: Progress, nodeId: string, value: number, date: string, at: number): Progress {
  const v = Math.floor(value)
  if (!Number.isFinite(v) || v < 1) return progress
  return { ...progress, logs: [...progress.logs, { nodeId, value: v, date, at }] }
}

const validIndex = (progress: Progress, index: number) =>
  Number.isInteger(index) && index >= 0 && index < progress.logs.length

/** Delete one logged set (for a mis-tap). Ignores an index that does not exist. */
export function removeSet(progress: Progress, index: number): Progress {
  if (!validIndex(progress, index)) return progress
  return { ...progress, logs: progress.logs.filter((_, i) => i !== index) }
}

/** Change the value of one logged set, with the same rules as `logSet`. */
export function editSet(progress: Progress, index: number, value: number): Progress {
  const v = Math.floor(value)
  if (!validIndex(progress, index) || !Number.isFinite(v) || v < 1) return progress
  return { ...progress, logs: progress.logs.map((l, i) => (i === index ? { ...l, value: v } : l)) }
}

/** Strength before skill; the sort is stable so JSON order breaks ties. */
const kindRank = (n: ExerciseNode) => (n.kind === 'skill' ? 1 : 0)

/** Nodes you could pick as the next focus in this branch once `fromId` is done. New unlocks first among equals. */
export function suggestNext(nodes: ExerciseNode[], progress: Progress, fromId: string): Suggestion[] {
  const from = indexNodes(nodes).get(fromId)
  if (!from) return []
  const before = new Set(progress.completed)
  const after = new Set([...progress.completed, fromId])
  const score = (s: Suggestion) => kindRank(s.node) * 2 + (s.isNew ? 0 : 1)
  return nodes
    .filter((n) => n.branch === from.branch && !after.has(n.id) && isUnlocked(n, after))
    .map((n) => ({ node: n, isNew: !isUnlocked(n, before) }))
    .sort((a, b) => score(a) - score(b))
}

function pickFocus(nodes: ExerciseNode[], done: Set<string>, branch: Branch): string | null {
  const open = nodes.filter((n) => n.branch === branch && !done.has(n.id) && isUnlocked(n, done))
  return [...open].sort((a, b) => kindRank(a) - kindRank(b))[0]?.id ?? null
}

/** Complete the branch's focus node and choose the next focus. Returns the same object if `fromId` is not the focus. */
export function levelUp(nodes: ExerciseNode[], progress: Progress, fromId: string, toId: string | null): Progress {
  const byId = indexNodes(nodes)
  const from = byId.get(fromId)
  if (!from || progress.focus[from.branch] !== fromId) return progress
  const completed = [...new Set([...progress.completed, fromId])]
  const done = new Set(completed)
  const to = toId ? byId.get(toId) : undefined
  const valid = !!to && to.branch === from.branch && !done.has(to.id) && isUnlocked(to, done)
  const focusId = valid ? to!.id : pickFocus(nodes, done, from.branch)
  return { ...progress, completed, focus: { ...progress.focus, [from.branch]: focusId } }
}

/** Make an available node the branch's focus. */
export function setFocus(nodes: ExerciseNode[], progress: Progress, nodeId: string): Progress {
  const node = indexNodes(nodes).get(nodeId)
  if (!node) return progress
  if (nodeState(node, progress) !== 'available') return progress
  return { ...progress, focus: { ...progress.focus, [node.branch]: nodeId } }
}

/** Turn anything read from storage into valid progress for the current graph. */
export function sanitizeProgress(nodes: ExerciseNode[], raw: unknown): Progress {
  const base = initialProgress(nodes)
  if (!raw || typeof raw !== 'object') return base
  const r = raw as { completed?: unknown; focus?: unknown; logs?: unknown }
  const byId = indexNodes(nodes)

  const completed = Array.isArray(r.completed)
    ? [...new Set(r.completed.filter((x): x is string => typeof x === 'string' && byId.has(x)))]
    : []
  const logs: SetLog[] = Array.isArray(r.logs)
    ? r.logs.filter(
        (l): l is SetLog =>
          !!l && typeof l === 'object' &&
          typeof (l as SetLog).nodeId === 'string' && byId.has((l as SetLog).nodeId) &&
          Number.isFinite((l as SetLog).value) && (l as SetLog).value >= 1 &&
          typeof (l as SetLog).date === 'string' && typeof (l as SetLog).at === 'number',
      )
    : []

  const done = new Set(completed)
  const rawFocus = r.focus && typeof r.focus === 'object' ? (r.focus as Record<string, unknown>) : {}
  const focus = { ...base.focus }
  for (const b of BRANCHES) {
    const id = rawFocus[b]
    const n = typeof id === 'string' ? byId.get(id) : undefined
    focus[b] = n && n.branch === b && !done.has(n.id) && isUnlocked(n, done) ? n.id : pickFocus(nodes, done, b)
  }
  return { completed, focus, logs }
}
