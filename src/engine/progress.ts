import type { Branch, DayType, ExerciseNode, Goal, GoalOverride } from '../data/types'
import { DAY_TYPES, DEFAULT_SCHEDULE } from '../data/schedule'
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

export const MAX_ACTIVE_SKILLS = 2

export interface Progress {
  completed: string[]
  /** strength exercise being trained per branch (never a skill step) */
  focus: Record<Branch, string | null>
  /** active skill chains (max 2) and the step each one is on; null = no trainable step */
  skillFocus: Record<string, string | null>
  logs: SetLog[]
  /** 7 entries, Monday first */
  schedule: DayType[]
  goalOverrides: Record<string, GoalOverride>
  onboarded: boolean
}

export interface Suggestion {
  node: ExerciseNode
  isNew: boolean
}

export function initialProgress(nodes: ExerciseNode[]): Progress {
  const focus = {} as Record<Branch, string | null>
  for (const b of BRANCHES) focus[b] = rootOf(nodes, b)?.id ?? null
  return { completed: [], focus, skillFocus: {}, logs: [], schedule: [...DEFAULT_SCHEDULE], goalOverrides: {}, onboarded: false }
}

export function isUnlocked(node: ExerciseNode, completed: Set<string>): boolean {
  return node.requires.every((r) => completed.has(r))
}

export function nodeState(node: ExerciseNode, progress: Progress): NodeState {
  if (progress.completed.includes(node.id)) return 'completed'
  if (progress.focus[node.branch] === node.id || Object.values(progress.skillFocus).includes(node.id)) return 'focus'
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

/**
 * Options for the next focus once `fromId` is done. For a strength exercise: strength nodes of its branch.
 * For a skill step: the other steps of the same chain. New unlocks first among equals.
 */
export function suggestNext(nodes: ExerciseNode[], progress: Progress, fromId: string): Suggestion[] {
  const from = indexNodes(nodes).get(fromId)
  if (!from) return []
  const before = new Set(progress.completed)
  const after = new Set([...progress.completed, fromId])
  const score = (s: Suggestion) => kindRank(s.node) * 2 + (s.isNew ? 0 : 1)
  return nodes
    .filter((n) => !after.has(n.id) && isUnlocked(n, after) && (from.skill ? n.skill === from.skill : n.branch === from.branch && !n.skill))
    .map((n) => ({ node: n, isNew: !isUnlocked(n, before) }))
    .sort((a, b) => score(a) - score(b))
}

/** Skill steps that completing `fromId` newly opens (so the app can point at the Skills tab). */
export function newlyUnlockedSkills(nodes: ExerciseNode[], progress: Progress, fromId: string): ExerciseNode[] {
  const own = indexNodes(nodes).get(fromId)?.skill // the next step of the chain you are already on is not "a new skill"
  const before = new Set(progress.completed)
  const after = new Set([...progress.completed, fromId])
  return nodes.filter((n) => n.skill && n.skill !== own && !after.has(n.id) && isUnlocked(n, after) && !isUnlocked(n, before))
}

/** First step of a chain that is not done and whose requirements are done, or null. */
export function firstStep(nodes: ExerciseNode[], done: Set<string>, chain: string): string | null {
  return nodes.find((n) => n.skill === chain && !done.has(n.id) && isUnlocked(n, done))?.id ?? null
}

function pickFocus(nodes: ExerciseNode[], done: Set<string>, branch: Branch): string | null {
  const open = nodes.filter((n) => n.branch === branch && !n.skill && !done.has(n.id) && isUnlocked(n, done))
  return [...open].sort((a, b) => kindRank(a) - kindRank(b))[0]?.id ?? null
}

function levelUpSkill(nodes: ExerciseNode[], progress: Progress, from: ExerciseNode, toId: string | null): Progress {
  const chain = from.skill!
  if (progress.skillFocus[chain] !== from.id) return progress
  const completed = [...new Set([...progress.completed, from.id])]
  const done = new Set(completed)
  const to = toId ? indexNodes(nodes).get(toId) : undefined
  const valid = !!to && to.skill === chain && !done.has(to.id) && isUnlocked(to, done)
  // a chain whose steps are all done leaves the active list, freeing its slot
  if (nodes.filter((n) => n.skill === chain).every((n) => done.has(n.id))) {
    const skillFocus = { ...progress.skillFocus }
    delete skillFocus[chain]
    return { ...progress, completed, skillFocus }
  }
  return { ...progress, completed, skillFocus: { ...progress.skillFocus, [chain]: valid ? to!.id : firstStep(nodes, done, chain) } }
}

/** Complete the current focus (branch or skill chain) and choose the next one. Returns the same object if `fromId` is not a focus. */
export function levelUp(nodes: ExerciseNode[], progress: Progress, fromId: string, toId: string | null): Progress {
  const byId = indexNodes(nodes)
  const from = byId.get(fromId)
  if (!from) return progress
  if (from.skill) return levelUpSkill(nodes, progress, from, toId)
  if (progress.focus[from.branch] !== fromId) return progress
  const completed = [...new Set([...progress.completed, fromId])]
  const done = new Set(completed)
  const to = toId ? byId.get(toId) : undefined
  const valid = !!to && to.branch === from.branch && !to.skill && !done.has(to.id) && isUnlocked(to, done)
  const focusId = valid ? to!.id : pickFocus(nodes, done, from.branch)
  return { ...progress, completed, focus: { ...progress.focus, [from.branch]: focusId } }
}

/** Make an available strength exercise the branch's focus. Skill steps are started with `activateSkill`. */
export function setFocus(nodes: ExerciseNode[], progress: Progress, nodeId: string): Progress {
  const node = indexNodes(nodes).get(nodeId)
  if (!node || node.skill) return progress
  if (nodeState(node, progress) !== 'available') return progress
  return { ...progress, focus: { ...progress.focus, [node.branch]: nodeId } }
}

/** Start training a skill chain at its first trainable step. Refuses unknown, active, locked, finished chains and a 3rd skill. */
export function activateSkill(nodes: ExerciseNode[], progress: Progress, chainId: string): Progress {
  if (chainId in progress.skillFocus) return progress
  if (Object.keys(progress.skillFocus).length >= MAX_ACTIVE_SKILLS) return progress
  const step = firstStep(nodes, new Set(progress.completed), chainId)
  if (!step) return progress
  return { ...progress, skillFocus: { ...progress.skillFocus, [chainId]: step } }
}

export function deactivateSkill(progress: Progress, chainId: string): Progress {
  if (!(chainId in progress.skillFocus)) return progress
  const skillFocus = { ...progress.skillFocus }
  delete skillFocus[chainId]
  return { ...progress, skillFocus }
}

const okOverride = (g: unknown): g is GoalOverride =>
  !!g && typeof g === 'object' &&
  Number.isInteger((g as GoalOverride).sets) && (g as GoalOverride).sets >= 1 && (g as GoalOverride).sets <= 10 &&
  Number.isInteger((g as GoalOverride).target) && (g as GoalOverride).target >= 1 && (g as GoalOverride).target <= 999

/**
 * Set (or with `null` clear) a personal goal for one exercise. Invalid values are ignored.
 * `nodes` is optional; when given, unknown node ids are ignored too.
 */
export function setGoalOverride(progress: Progress, nodeId: string, goal: GoalOverride | null, nodes?: ExerciseNode[]): Progress {
  if (nodes && !nodes.some((n) => n.id === nodeId)) return progress
  if (goal === null) {
    if (!(nodeId in progress.goalOverrides)) return progress
    const goalOverrides = { ...progress.goalOverrides }
    delete goalOverrides[nodeId]
    return { ...progress, goalOverrides }
  }
  if (!okOverride(goal)) return progress
  return { ...progress, goalOverrides: { ...progress.goalOverrides, [nodeId]: { sets: goal.sets, target: goal.target } } }
}

/** Nodes with personal goals applied. Returns the same array when there are no overrides. */
export function applyOverrides(nodes: ExerciseNode[], overrides: Record<string, GoalOverride>): ExerciseNode[] {
  if (Object.keys(overrides).length === 0) return nodes
  return nodes.map((n) => (overrides[n.id] ? { ...n, goal: { ...n.goal, sets: overrides[n.id].sets, target: overrides[n.id].target } } : n))
}

export function setDayType(progress: Progress, weekday: number, type: DayType): Progress {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !DAY_TYPES.includes(type)) return progress
  return { ...progress, schedule: progress.schedule.map((d, i) => (i === weekday ? type : d)) }
}

export const finishOnboarding = (progress: Progress): Progress => ({ ...progress, onboarded: true })
export const restartOnboarding = (progress: Progress): Progress => ({ ...progress, onboarded: false })

/** Turn anything read from storage (including Plan 1 saves) into valid progress for the current graph. */
export function sanitizeProgress(nodes: ExerciseNode[], raw: unknown): Progress {
  const base = initialProgress(nodes)
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Record<string, unknown>
  const byId = indexNodes(nodes)

  const completed = Array.isArray(r.completed)
    ? [...new Set(r.completed.filter((x): x is string => typeof x === 'string' && byId.has(x)))]
    : []
  const logs: SetLog[] = Array.isArray(r.logs)
    ? r.logs
        .filter(
          (l): l is SetLog =>
            !!l && typeof l === 'object' &&
            typeof (l as SetLog).nodeId === 'string' && byId.has((l as SetLog).nodeId) &&
            Number.isFinite((l as SetLog).value) &&
            typeof (l as SetLog).date === 'string' && typeof (l as SetLog).at === 'number',
        )
        .map((l) => ({ nodeId: l.nodeId, value: Math.floor(l.value), date: l.date, at: l.at }))
        .filter((l) => l.value >= 1)
    : []
  const done = new Set(completed)

  const rawFocus = r.focus && typeof r.focus === 'object' ? (r.focus as Record<string, unknown>) : {}
  const focus = { ...base.focus }
  for (const b of BRANCHES) {
    const id = rawFocus[b]
    const n = typeof id === 'string' ? byId.get(id) : undefined
    focus[b] = n && n.branch === b && !n.skill && !done.has(n.id) && isUnlocked(n, done) ? n.id : pickFocus(nodes, done, b)
  }

  const rawSkill = r.skillFocus && typeof r.skillFocus === 'object' ? (r.skillFocus as Record<string, unknown>) : {}
  const skillFocus: Record<string, string | null> = {}
  for (const chain of Object.keys(rawSkill)) {
    if (Object.keys(skillFocus).length >= MAX_ACTIVE_SKILLS) break
    if (!nodes.some((n) => n.skill === chain)) continue
    if (nodes.filter((n) => n.skill === chain).every((n) => done.has(n.id))) continue // finished chains are not active
    const stored = typeof rawSkill[chain] === 'string' ? byId.get(rawSkill[chain] as string) : undefined
    const ok = !!stored && stored.skill === chain && !done.has(stored.id) && isUnlocked(stored, done)
    skillFocus[chain] = ok ? stored!.id : firstStep(nodes, done, chain)
  }

  // Plan 1 saves could hold a skill step as a branch focus: carry it over as an active skill when there is room
  for (const b of BRANCHES) {
    const id = rawFocus[b]
    const n = typeof id === 'string' ? byId.get(id) : undefined
    if (!n?.skill || n.skill in skillFocus || Object.keys(skillFocus).length >= MAX_ACTIVE_SKILLS) continue
    const step = !done.has(n.id) && isUnlocked(n, done) ? n.id : firstStep(nodes, done, n.skill)
    if (step) skillFocus[n.skill] = step
  }

  const schedule =
    Array.isArray(r.schedule) && r.schedule.length === 7 && r.schedule.every((d) => DAY_TYPES.includes(d as DayType))
      ? ([...r.schedule] as DayType[])
      : base.schedule

  const goalOverrides: Record<string, GoalOverride> = {}
  if (r.goalOverrides && typeof r.goalOverrides === 'object') {
    for (const [id, g] of Object.entries(r.goalOverrides as Record<string, unknown>)) {
      if (byId.has(id) && okOverride(g)) goalOverrides[id] = { sets: g.sets, target: g.target }
    }
  }

  const onboarded = typeof r.onboarded === 'boolean' ? r.onboarded : completed.length > 0 || logs.length > 0
  return { completed, focus, skillFocus, logs, schedule, goalOverrides, onboarded }
}
