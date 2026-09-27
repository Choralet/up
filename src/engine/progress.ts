import type { DayType, ExerciseNode, Goal, GoalOverride } from '../data/types'
import { DAY_TYPES, DEFAULT_SCHEDULE } from '../data/schedule'
import { ADDED_BELOW } from '../data/tracks'
import { indexNodes } from './graph'

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

/** Today's "Train Anyway" choice and warm-up ticks; only valid for `date`. */
export interface DayState {
  date: string
  pick: DayType | null
  warm: string[]
}

export type WorkoutLength = 'short' | 'standard' | 'full'
export const WORKOUT_LENGTHS: WorkoutLength[] = ['short', 'standard', 'full']

export interface Settings {
  /** soft tone when a hold reaches its goal */
  holdSound: boolean
  /** how many exercises a day's workout has */
  length: WorkoutLength
  lastExportAt?: number
}

export interface Progress {
  completed: string[]
  /** strength exercise being trained per movement track (never a skill step) */
  focus: Record<string, string | null>
  /** active skill chains (max 2) and the step each one is on; null = no trainable step */
  skillFocus: Record<string, string | null>
  logs: SetLog[]
  /** 7 entries, Monday first */
  schedule: DayType[]
  goalOverrides: Record<string, GoalOverride>
  /** goal ramp after a level-up: 0 = 60%, 1 = 80%, 2 = full target; no entry = full */
  goalStage: Record<string, number>
  onboarded: boolean
  /** achievement ids already shown; null = an older save (everything earned so far counts as seen) */
  seenAchievements: string[] | null
  day: DayState | null
  settings: Settings
}

export interface Suggestion {
  node: ExerciseNode
  isNew: boolean
}

export function initialProgress(nodes: ExerciseNode[]): Progress {
  const focus: Record<string, string | null> = {}
  for (const t of trackKeys(nodes)) focus[t] = pickFocus(nodes, new Set(), t)
  return { completed: [], focus, skillFocus: {}, logs: [], schedule: [...DEFAULT_SCHEDULE], goalOverrides: {}, goalStage: {}, onboarded: false, seenAchievements: [], day: null, settings: { holdSound: true, length: 'standard' } }
}

export function isUnlocked(node: ExerciseNode, completed: Set<string>): boolean {
  return node.requires.every((r) => completed.has(r))
}

export function nodeState(node: ExerciseNode, progress: Progress): NodeState {
  if (progress.completed.includes(node.id)) return 'completed'
  if (Object.values(progress.focus).includes(node.id) || Object.values(progress.skillFocus).includes(node.id)) return 'focus'
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
    .filter((n) => !after.has(n.id) && isUnlocked(n, after) && (from.skill ? n.skill === from.skill : !n.skill && trackOf(n) === trackOf(from)))
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

/** Give every empty track its first trainable exercise (a level-up elsewhere can unlock one). */
function refill(nodes: ExerciseNode[], focus: Record<string, string | null>, done: Set<string>): Record<string, string | null> {
  const next = { ...focus }
  for (const t of trackKeys(nodes)) if (!next[t]) next[t] = pickFocus(nodes, done, t)
  return next
}

/** A strength exercise's movement track (falls back to its branch for data without tracks). */
export const trackOf = (n: ExerciseNode): string => n.track ?? n.branch

/** Every track that has strength exercises, in data order. */
export function trackKeys(nodes: ExerciseNode[]): string[] {
  return [...new Set(nodes.filter((n) => !n.skill).map(trackOf))]
}

/** The first strength exercise of a track that is not done and is unlocked. */
function pickFocus(nodes: ExerciseNode[], done: Set<string>, track: string): string | null {
  return nodes.find((n) => !n.skill && trackOf(n) === track && !done.has(n.id) && isUnlocked(n, done))?.id ?? null
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
  const next = valid ? to!.id : firstStep(nodes, done, chain)
  const goalStage = next ? { ...progress.goalStage, [next]: 0 } : progress.goalStage
  return { ...progress, completed, goalStage, skillFocus: { ...progress.skillFocus, [chain]: next } }
}

/** Complete the current focus (branch or skill chain) and choose the next one. Returns the same object if `fromId` is not a focus. */
export function levelUp(nodes: ExerciseNode[], progress: Progress, fromId: string, toId: string | null): Progress {
  const byId = indexNodes(nodes)
  const from = byId.get(fromId)
  if (!from) return progress
  if (from.skill) return levelUpSkill(nodes, progress, from, toId)
  const track = trackOf(from)
  if (progress.focus[track] !== fromId) return progress
  const completed = [...new Set([...progress.completed, fromId])]
  const done = new Set(completed)
  const to = toId ? byId.get(toId) : undefined
  const valid = !!to && !to.skill && trackOf(to) === track && !done.has(to.id) && isUnlocked(to, done)
  const focusId = valid ? to!.id : pickFocus(nodes, done, track)
  const goalStage = focusId ? { ...progress.goalStage, [focusId]: 0 } : progress.goalStage
  return { ...progress, completed, goalStage, focus: refill(nodes, { ...progress.focus, [track]: focusId }, done) }
}

const RAMP = [0.6, 0.8, 1]
export const FINAL_STAGE = RAMP.length - 1

/** The goal at a ramp stage: same sets, target scaled (at least 1). */
export function effectiveGoal(goal: Goal, stage: number): Goal {
  const f = RAMP[Math.min(Math.max(stage, 0), FINAL_STAGE)]
  return { ...goal, target: Math.max(1, Math.round(goal.target * f)) }
}

/** Nodes with their current ramp stage applied (nodes without a stage keep the full goal). */
export function applyStages(nodes: ExerciseNode[], stages: Record<string, number>): ExerciseNode[] {
  if (Object.keys(stages).length === 0) return nodes
  return nodes.map((n) => (n.id in stages ? { ...n, goal: effectiveGoal(n.goal, stages[n.id]) } : n))
}

/** One step up the ramp; the same object when already at the full goal or not ramping. */
export function advanceStage(progress: Progress, nodeId: string): Progress {
  const st = progress.goalStage[nodeId]
  if (st === undefined || st >= FINAL_STAGE) return progress
  return { ...progress, goalStage: { ...progress.goalStage, [nodeId]: st + 1 } }
}

/** Make an available strength exercise the branch's focus. Skill steps are started with `activateSkill`. */
export function setFocus(nodes: ExerciseNode[], progress: Progress, nodeId: string): Progress {
  const node = indexNodes(nodes).get(nodeId)
  if (!node || node.skill) return progress
  if (nodeState(node, progress) !== 'available') return progress
  return { ...progress, focus: { ...progress.focus, [trackOf(node)]: nodeId } }
}

/** "I can already do this": complete the steps in order, each only if its requirements are met by then. */
export function completeSteps(nodes: ExerciseNode[], progress: Progress, ids: string[]): Progress {
  const byId = indexNodes(nodes)
  const done = new Set(progress.completed)
  for (const id of ids) {
    const n = byId.get(id)
    if (n && !done.has(id) && isUnlocked(n, done)) done.add(id)
  }
  if (done.size === progress.completed.length) return progress
  return sanitizeProgress(nodes, { ...progress, completed: [...done] })
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
  // a "Train Anyway" pick made for the old schedule no longer makes sense
  const day = progress.day ? { ...progress.day, pick: null } : null
  return { ...progress, day, schedule: progress.schedule.map((d, i) => (i === weekday ? type : d)) }
}

export function todayState(progress: Progress, date: string): { pick: DayType | null; warm: string[] } {
  return progress.day?.date === date ? { pick: progress.day.pick, warm: progress.day.warm } : { pick: null, warm: [] }
}

const dayFor = (progress: Progress, date: string): DayState => (progress.day?.date === date ? progress.day : { date, pick: null, warm: [] })

export function setDayPick(progress: Progress, date: string, pick: DayType | null): Progress {
  return { ...progress, day: { ...dayFor(progress, date), pick } }
}

export function toggleWarm(progress: Progress, date: string, key: string): Progress {
  const d = dayFor(progress, date)
  const warm = d.warm.includes(key) ? d.warm.filter((k) => k !== key) : [...d.warm, key]
  return { ...progress, day: { ...d, warm } }
}

/** Nodes that were locked before a change and are unlocked (not done) after it: the unlock moment. */
export function unlockedBy(nodes: ExerciseNode[], before: Progress, after: Progress): string[] {
  const b = new Set(before.completed)
  const a = new Set(after.completed)
  return nodes.filter((n) => !a.has(n.id) && !isUnlocked(n, b) && isUnlocked(n, a)).map((n) => n.id)
}

export function markSeen(progress: Progress, ids: string[]): Progress {
  const seen = new Set([...(progress.seenAchievements ?? []), ...ids])
  return { ...progress, seenAchievements: [...seen] }
}

export function setSettings(progress: Progress, patch: Partial<Settings>): Progress {
  return { ...progress, settings: { ...progress.settings, ...patch } }
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
  const rawFocus = r.focus && typeof r.focus === 'object' ? (r.focus as Record<string, unknown>) : {}
  const rawSkill = r.skillFocus && typeof r.skillFocus === 'object' ? (r.skillFocus as Record<string, unknown>) : {}
  // Exercises that were a skill step before and are a track exercise now (Parallel bar dip → Dip)
  const converted = Object.values(rawSkill).map((id) => (typeof id === 'string' ? byId.get(id) : undefined)).filter((n): n is ExerciseNode => !!n && !n.skill)

  // Catch-up for older saves: the easier steps added in Plan 6 below work you already did (or were training)
  // count as done, so no one is sent back to a beginner move. Nothing else is ever filled in.
  const done = new Set(completed)
  const legacyFocus = [...Object.values(rawFocus), ...converted.map((n) => n.id)]
    .map((id) => (typeof id === 'string' ? byId.get(id) : undefined))
    .filter((n): n is ExerciseNode => !!n && !n.skill)
  const queue = [...completed.map((id) => byId.get(id)!), ...legacyFocus]
  while (queue.length) {
    const n = queue.pop()!
    if (n.skill) continue
    for (const r of n.requires) {
      const p = byId.get(r)
      if (p && ADDED_BELOW.has(p.id) && trackOf(p) === trackOf(n) && !done.has(p.id)) {
        done.add(p.id)
        completed.push(p.id)
        queue.push(p)
      }
    }
  }

  const trainable = (n: ExerciseNode | undefined, t: string) => !!n && !n.skill && trackOf(n) === t && !done.has(n.id) && isUnlocked(n, done)
  const stored = [...Object.values(rawFocus), ...converted.map((n) => n.id)].filter((v): v is string => typeof v === 'string').map((id) => byId.get(id))
  const focus: Record<string, string | null> = {}
  for (const t of trackKeys(nodes)) {
    const own = typeof rawFocus[t] === 'string' ? byId.get(rawFocus[t] as string) : undefined
    // older saves keyed focus by branch: take any stored exercise that belongs to this track
    const pick = trainable(own, t) ? own : stored.find((n) => trainable(n, t))
    focus[t] = pick ? pick.id : pickFocus(nodes, done, t)
  }

  const skillFocus: Record<string, string | null> = {}
  for (const chain of Object.keys(rawSkill)) {
    if (Object.keys(skillFocus).length >= MAX_ACTIVE_SKILLS) break
    if (!nodes.some((n) => n.skill === chain)) continue
    if (converted.some((n) => n.id === rawSkill[chain])) continue // its step is a track exercise now (see above)
    if (nodes.filter((n) => n.skill === chain).every((n) => done.has(n.id))) continue // finished chains are not active
    const stored = typeof rawSkill[chain] === 'string' ? byId.get(rawSkill[chain] as string) : undefined
    const ok = !!stored && stored.skill === chain && !done.has(stored.id) && isUnlocked(stored, done)
    skillFocus[chain] = ok ? stored!.id : firstStep(nodes, done, chain)
  }

  // Plan 1 saves could hold a skill step as a branch focus: carry it over as an active skill when there is room
  for (const id of Object.values(rawFocus)) {
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

  const goalStage: Record<string, number> = {}
  if (r.goalStage && typeof r.goalStage === 'object') {
    for (const [id, st] of Object.entries(r.goalStage as Record<string, unknown>)) {
      if (byId.has(id) && Number.isInteger(st) && (st as number) >= 0 && (st as number) <= FINAL_STAGE) goalStage[id] = st as number
    }
  }
  const onboarded = typeof r.onboarded === 'boolean' ? r.onboarded : completed.length > 0 || logs.length > 0
  const rd = r.day as Partial<DayState> | undefined
  const day: DayState | null =
    rd && typeof rd === 'object' && typeof rd.date === 'string' && (rd.pick === null || DAY_TYPES.includes(rd.pick as DayType)) &&
    Array.isArray(rd.warm) && rd.warm.every((w) => typeof w === 'string')
      ? { date: rd.date, pick: rd.pick as DayType | null, warm: [...rd.warm] }
      : null
  const rs = r.settings as Partial<Settings> | undefined
  const settings: Settings = {
    holdSound: rs && typeof rs === 'object' && typeof rs.holdSound === 'boolean' ? rs.holdSound : true,
    length: rs && typeof rs === 'object' && WORKOUT_LENGTHS.includes(rs.length as WorkoutLength) ? (rs.length as WorkoutLength) : 'standard',
  }
  if (rs && typeof rs === 'object' && typeof rs.lastExportAt === 'number') settings.lastExportAt = rs.lastExportAt
  const seenAchievements = Array.isArray(r.seenAchievements) ? r.seenAchievements.filter((x): x is string => typeof x === 'string') : null
  return { completed, focus, skillFocus, logs, schedule, goalOverrides, goalStage, onboarded, seenAchievements, day, settings }
}
