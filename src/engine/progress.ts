import type { DayType, ExerciseNode, Goal, GoalOverride, WeekPlan } from '../data/types'
import { DAY_TYPES, DEFAULT_SCHEDULE, OLD_DEFAULT_SCHEDULE, PLAN_DAYS } from '../data/schedule'
import { currentId, LEGACY_CHAINS, LEGACY_DROP_LOGS } from '../data/legacy'
import { canDo, type Kit } from './equipment'
import { indexNodes } from './graph'
import { computeDepths } from './layout'

/** `gear`: needs equipment you don't have (it is stepped over, see `passedSet`). */
export type NodeState = 'locked' | 'available' | 'focus' | 'completed' | 'gear'

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
  /** equipment codes you own (the floor is implied); not set = everything counts as owned */
  equipment?: string[]
  /** full body 3× a week (default) or Push / Pull / Legs */
  plan: WeekPlan
  /** a short rest countdown after each logged set */
  restTimer: boolean
  /** an older custom Push/Pull/Legs schedule: Today offers full body once */
  offerFullBody?: boolean
}

const PPL_ROTATION: DayType[] = ['push', 'pull', 'legs']

/**
 * Workout type per weekday for the ticked days. Full body: every ticked day is a full-body day. Push/Pull/Legs: days
 * that already had a split workout keep it (a custom schedule survives); new days get the type used least so far
 * (ties: Push, Pull, Legs + Core).
 */
export function assignDays(schedule: DayType[], ticked: boolean[], plan: WeekPlan = 'ppl'): DayType[] {
  if (plan === 'full') return schedule.map((_, i) => (ticked[i] ? 'full' : 'rest'))
  const count: Record<string, number> = { push: 0, pull: 0, legs: 0 }
  schedule.forEach((d, i) => { if (ticked[i] && d in count) count[d]++ })
  return schedule.map((d, i) => {
    if (!ticked[i]) return 'rest'
    if (d in count) return d
    const pick = [...PPL_ROTATION].sort((a, b) => count[a] - count[b])[0]
    count[pick]++
    return pick
  })
}

/** Switch the weekly plan, keeping your training days. */
export function setPlan(progress: Progress, plan: WeekPlan): Progress {
  const training = progress.schedule.map((d) => d !== 'rest')
  const schedule = assignDays(progress.schedule.map((d) => (plan === 'ppl' && d === 'full' ? 'rest' : d)), training, plan)
  const settings = { ...progress.settings, plan }
  delete settings.offerFullBody
  const day = progress.day ? { ...progress.day, pick: null } : null
  return { ...progress, schedule, settings, day }
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
  /** the day a stage was raised; the raised goal starts the next day */
  stageRaisedOn: Record<string, string>
  /** "Keep building": how many times a finished exercise's goal went up (+2 reps or +5 s each) */
  keepStep: Record<string, number>
  /** the day a keep step was added; it starts the next day */
  keepRaisedOn: Record<string, string>
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

/**
 * Plan 9: an exercise you start on begins at the first ramp stage (60%, or the first step of its build-up).
 * Gives stage 0 to every track or skill exercise in `after` that wasn't trained in `before` and has no stage yet.
 */
export function rampNew(before: Pick<Progress, 'focus' | 'skillFocus'> | null, after: Progress): Progress {
  const was = new Set(before ? [...Object.values(before.focus), ...Object.values(before.skillFocus)] : [])
  const fresh = [...Object.values(after.focus), ...Object.values(after.skillFocus)]
    .filter((id): id is string => !!id && !was.has(id) && !(id in after.goalStage) && !after.completed.includes(id))
  if (fresh.length === 0) return after
  return { ...after, goalStage: { ...after.goalStage, ...Object.fromEntries(fresh.map((id) => [id, 0])) } }
}

export function initialProgress(nodes: ExerciseNode[]): Progress {
  const focus: Record<string, string | null> = {}
  for (const t of trackKeys(nodes)) focus[t] = pickFocus(nodes, new Set(), t)
  const stages = Object.fromEntries(Object.values(focus).filter((id): id is string => !!id).map((id) => [id, 0]))
  return { completed: [], focus, skillFocus: {}, logs: [], schedule: [...DEFAULT_SCHEDULE], goalOverrides: {}, goalStage: stages, stageRaisedOn: {}, keepStep: {}, keepRaisedOn: {}, onboarded: false, seenAchievements: [], day: null, settings: { holdSound: true, length: 'standard', plan: 'full', restTimer: true } }
}

export function isUnlocked(node: ExerciseNode, completed: Set<string>): boolean {
  return node.requires.every((r) => completed.has(r))
}

export const kitOf = (progress: Pick<Progress, 'settings'>): Kit => progress.settings.equipment

/**
 * Completed exercises plus the ones you step over: an exercise you can't do with your equipment counts as passed
 * once everything it needs is passed, so it doesn't block the rest of its ladder. At most one in a row: the exercise
 * below a stepped-over one must be really done (Plan 9), so missing gear never jumps you several steps up a ladder.
 * Unlock checks use this set.
 */
export function passedSet(nodes: ExerciseNode[], completed: Iterable<string>, kit: Kit): Set<string> {
  const real = new Set(completed)
  const done = new Set(real)
  if (!kit) return done
  const trees = new Map(nodes.map((n) => [n.id, n.tree]))
  // the exercise(s) it builds on in its own ladder (a Roadmap move: everything it needs)
  const below = (n: ExerciseNode) => n.requires.filter((r) => !n.tree || trees.get(r) === n.tree)
  for (let grew = true; grew; ) {
    grew = false
    for (const n of nodes) {
      if (!done.has(n.id) && !canDo(n, kit) && isUnlocked(n, done) && below(n).every((r) => real.has(r))) {
        done.add(n.id)
        grew = true
      }
    }
  }
  return done
}

const passedCache = new WeakMap<Progress, WeakMap<ExerciseNode[], Set<string>>>()
/** `passedSet` for a progress object (cached: progress is never changed in place). */
export function passedFor(nodes: ExerciseNode[], progress: Progress): Set<string> {
  let byNodes = passedCache.get(progress)
  if (!byNodes) passedCache.set(progress, (byNodes = new WeakMap()))
  let set = byNodes.get(nodes)
  if (!set) byNodes.set(nodes, (set = passedSet(nodes, progress.completed, kitOf(progress))))
  return set
}

/**
 * `ids` plus the same exercises in other trees, each once its own requirements are passed: a linked exercise
 * never opens a locked ladder (Lying leg raise waits for Dragon flag's gate), and is finished as soon as it opens.
 */
export function withTwins(nodes: ExerciseNode[], ids: string[], kit: Kit): string[] {
  const done = new Set(ids)
  for (let grew = true; grew; ) {
    grew = false
    const passed = passedSet(nodes, done, kit)
    for (const n of nodes) {
      if (!done.has(n.id) && n.twins?.some((t) => done.has(t)) && isUnlocked(n, passed)) {
        done.add(n.id)
        grew = true
      }
    }
  }
  return [...done]
}

/** `passed` (from `passedFor`) tells stepped-over exercises apart; without it only completed ones count. */
export function nodeState(node: ExerciseNode, progress: Progress, passed?: Set<string>): NodeState {
  if (progress.completed.includes(node.id)) return 'completed'
  if (Object.values(progress.focus).includes(node.id) || Object.values(progress.skillFocus).includes(node.id)) return 'focus'
  if (!canDo(node, kitOf(progress))) return 'gear'
  return isUnlocked(node, passed ?? new Set(progress.completed)) ? 'available' : 'locked'
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

/**
 * The next exercise up a track's main line (its longest path) from `fromId`, stepping over ones you can't do;
 * null when there is none. Find your level walks this line, so it never asks a side branch (Jackknife pull-up).
 */
export function mainLineNext(nodes: ExerciseNode[], progress: Progress, fromId: string): string | null {
  const byId = indexNodes(nodes)
  const from = byId.get(fromId)
  if (!from || from.skill) return null
  const kids = (id: string) => nodes.filter((n) => !n.skill && n.requires.includes(id) && trackOf(n) === trackOf(from))
  const height = (n: ExerciseNode): number => 1 + Math.max(0, ...kids(n.id).map(height))
  const tallest = (id: string) => kids(id).sort((a, b) => height(b) - height(a))[0]
  const passed = passedSet(nodes, [...progress.completed, fromId], kitOf(progress))
  let next = tallest(fromId)
  while (next && passed.has(next.id)) next = tallest(next.id)
  return next?.id ?? null
}

/** Strength before skill; the sort is stable so JSON order breaks ties. */
const kindRank = (n: ExerciseNode) => (n.kind === 'skill' ? 1 : 0)

/**
 * Options for the next focus once `fromId` is done. For a strength exercise: strength nodes of its branch.
 * For a skill step: the other steps of the same chain. New unlocks first among equals.
 */
export function suggestNext(nodes: ExerciseNode[], progress: Progress, fromId: string): Suggestion[] {
  const byId = indexNodes(nodes)
  const from = byId.get(fromId)
  if (!from) return []
  const before = passedFor(nodes, progress)
  const after = passedSet(nodes, withTwins(nodes, [...progress.completed, fromId], kitOf(progress)), kitOf(progress))
  // gentlest first: lower on its ladder, then strength before skill (Plan 9); data order breaks ties
  const depth = computeDepths(nodes)
  const score = (s: Suggestion) => depth.get(s.node.id)! * 2 + kindRank(s.node)
  return nodes
    .filter((n) => !after.has(n.id) && isUnlocked(n, after) && (from.skill ? n.skill === from.skill : !n.skill && trackOf(n) === trackOf(from)))
    .map((n) => ({ node: n, isNew: !isUnlocked(n, before) }))
    .sort((a, b) => score(a) - score(b))
}

/** Skill steps that completing `fromId` newly opens (so the app can point at the Skills tab). */
export function newlyUnlockedSkills(nodes: ExerciseNode[], progress: Progress, fromId: string): ExerciseNode[] {
  const byId = indexNodes(nodes)
  const own = byId.get(fromId)?.skill // the next step of the chain you are already on is not "a new skill"
  const before = passedFor(nodes, progress)
  const after = passedSet(nodes, withTwins(nodes, [...progress.completed, fromId], kitOf(progress)), kitOf(progress))
  return nodes.filter((n) => n.skill && n.skill !== own && !after.has(n.id) && isUnlocked(n, after) && !isUnlocked(n, before))
}

/** First step of a chain that is not passed and whose requirements are passed (`done` from `passedSet`), or null. */
export function firstStep(nodes: ExerciseNode[], done: Set<string>, chain: string, kit?: Kit): string | null {
  return nodes.find((n) => n.skill === chain && ready(n, done, kit))?.id ?? null
}

/** Not passed, everything it needs passed, and you have the equipment. */
const ready = (n: ExerciseNode, done: Set<string>, kit: Kit) => !done.has(n.id) && isUnlocked(n, done) && canDo(n, kit)

const trainable = (n: ExerciseNode | undefined, track: string, done: Set<string>, kit: Kit) =>
  !!n && !n.skill && trackOf(n) === track && ready(n, done, kit)

/**
 * After completions or equipment change: every track and active skill keeps its exercise when it is still
 * trainable, else gets the first trainable one. A skill whose steps are all passed leaves the active list.
 */
export function settleFocus(nodes: ExerciseNode[], progress: Progress): Progress {
  const byId = indexNodes(nodes)
  const kit = kitOf(progress)
  const done = passedSet(nodes, progress.completed, kit)
  const focus: Record<string, string | null> = {}
  for (const t of trackKeys(nodes)) {
    const id = progress.focus[t]
    focus[t] = id && trainable(byId.get(id), t, done, kit) ? id : pickFocus(nodes, done, t, kit)
  }
  const skillFocus: Record<string, string | null> = {}
  for (const [chain, id] of Object.entries(progress.skillFocus)) {
    const steps = nodes.filter((n) => n.skill === chain)
    if (steps.length === 0 || steps.every((n) => done.has(n.id))) continue
    const n = id ? byId.get(id) : undefined
    const step = n && n.skill === chain && ready(n, done, kit) ? n.id : firstStep(nodes, done, chain, kit)
    // nothing left you can train here without more equipment: free the slot
    if (!step && steps.some((x) => !done.has(x.id) && isUnlocked(x, done) && !canDo(x, kit))) continue
    skillFocus[chain] = step
  }
  return rampNew(progress, { ...progress, focus, skillFocus })
}

/** A strength exercise's movement track (falls back to its branch for data without tracks). */
export const trackOf = (n: ExerciseNode): string => n.track ?? n.branch

/** Every track that has strength exercises, in data order. */
export function trackKeys(nodes: ExerciseNode[]): string[] {
  return [...new Set(nodes.filter((n) => !n.skill).map(trackOf))]
}

/** The first strength exercise of a track that is not passed and is unlocked. */
function pickFocus(nodes: ExerciseNode[], done: Set<string>, track: string, kit?: Kit): string | null {
  return nodes.find((n) => trainable(n, track, done, kit))?.id ?? null
}

/** A finished exercise shows its full goal again: its ramp stage goes. */
const withoutStage = (stages: Record<string, number>, id: string) => {
  if (!(id in stages)) return stages
  const out = { ...stages }
  delete out[id]
  return out
}

function levelUpSkill(nodes: ExerciseNode[], progress: Progress, from: ExerciseNode, toId: string | null): Progress {
  const chain = from.skill!
  if (progress.skillFocus[chain] !== from.id) return progress
  const byId = indexNodes(nodes)
  const completed = withTwins(nodes, [...progress.completed, from.id], kitOf(progress))
  const done = passedSet(nodes, completed, kitOf(progress))
  const to = toId ? byId.get(toId) : undefined
  const valid = !!to && to.skill === chain && ready(to, done, kitOf(progress))
  // a chain whose steps are all passed leaves the active list (settleFocus), freeing its slot
  const next = valid ? to!.id : firstStep(nodes, done, chain, kitOf(progress))
  const goalStage = withoutStage(next ? { ...progress.goalStage, [next]: 0 } : progress.goalStage, from.id)
  return settleFocus(nodes, { ...progress, completed, goalStage, skillFocus: { ...progress.skillFocus, [chain]: next } })
}

/** Complete the current focus (branch or skill chain) and choose the next one. Returns the same object if `fromId` is not a focus. */
export function levelUp(nodes: ExerciseNode[], progress: Progress, fromId: string, toId: string | null): Progress {
  const byId = indexNodes(nodes)
  const from = byId.get(fromId)
  if (!from) return progress
  if (from.skill) return levelUpSkill(nodes, progress, from, toId)
  const track = trackOf(from)
  if (progress.focus[track] !== fromId) return progress
  const completed = withTwins(nodes, [...progress.completed, fromId], kitOf(progress))
  const done = passedSet(nodes, completed, kitOf(progress))
  const to = toId ? byId.get(toId) : undefined
  const focusId = to && trainable(to, track, done, kitOf(progress)) ? to.id : pickFocus(nodes, done, track, kitOf(progress))
  const goalStage = withoutStage(focusId ? { ...progress.goalStage, [focusId]: 0 } : progress.goalStage, fromId)
  return settleFocus(nodes, { ...progress, completed, goalStage, focus: { ...progress.focus, [track]: focusId } })
}

const RAMP = [0.6, 0.8, 1]
export const FINAL_STAGE = RAMP.length - 1

/** The goal at a ramp stage: same sets, target scaled (at least 1). */
/** The last ramp stage: the end of the exercise's own build-up, or 2 (100%). */
export const finalStage = (steps?: Goal[]) => (steps ? steps.length - 1 : FINAL_STAGE)

/** The goal at a ramp stage: a step of the exercise's own build-up, or the same sets with the target scaled (at least 1). */
export function effectiveGoal(goal: Goal, stage: number, steps?: Goal[]): Goal {
  if (steps) return steps[Math.min(Math.max(stage, 0), steps.length - 1)]
  const f = RAMP[Math.min(Math.max(stage, 0), FINAL_STAGE)]
  return { ...goal, target: Math.max(1, Math.round(goal.target * f)) }
}

/** Nodes with their current ramp stage applied (nodes without a stage keep the full goal). */
export function applyStages(nodes: ExerciseNode[], stages: Record<string, number>): ExerciseNode[] {
  if (Object.keys(stages).length === 0) return nodes
  return nodes.map((n) => (n.id in stages ? { ...n, goal: effectiveGoal(n.goal, stages[n.id], n.steps) } : n))
}

/** One step up the ramp; the same object when already at the full goal or not ramping. */
export function advanceStage(progress: Progress, nodeId: string, steps?: Goal[]): Progress {
  const st = progress.goalStage[nodeId]
  if (st === undefined || st >= finalStage(steps)) return progress
  return { ...progress, goalStage: { ...progress.goalStage, [nodeId]: st + 1 } }
}
/** The stage each exercise trains at today: a goal raised today starts next session. */
export function currentStages(progress: Pick<Progress, 'goalStage' | 'stageRaisedOn'>, today: string): Record<string, number> {
  const out = { ...progress.goalStage }
  for (const [id, on] of Object.entries(progress.stageRaisedOn)) if (on === today && id in out) out[id] = Math.max(0, out[id] - 1)
  return out
}
/**
 * After today's sets of an exercise change: meeting today's stage goal raises the goal for
 * next time (once a day); removing or fixing sets so it's no longer met undoes today's raise.
 * The full goal offers a level-up instead, so it never raises the stage.
 */
export function settleStage(progress: Progress, nodeId: string, final: Goal, today: string, steps?: Goal[]): Progress {
  const st = progress.goalStage[nodeId]
  if (st === undefined || progress.completed.includes(nodeId)) return progress
  const raisedToday = progress.stageRaisedOn[nodeId] === today
  const stage = raisedToday ? st - 1 : st
  const values = todaysValues(progress, nodeId, today)
  const metStage = goalMet(effectiveGoal(final, stage, steps), values)
  if (raisedToday && !metStage) {
    const stageRaisedOn = { ...progress.stageRaisedOn }
    delete stageRaisedOn[nodeId]
    return { ...progress, goalStage: { ...progress.goalStage, [nodeId]: stage }, stageRaisedOn }
  }
  if (!raisedToday && stage < finalStage(steps) && metStage && !goalMet(final, values)) {
    return { ...progress, goalStage: { ...progress.goalStage, [nodeId]: stage + 1 }, stageRaisedOn: { ...progress.stageRaisedOn, [nodeId]: today } }
  }
  return progress
}

/** "Keep building": a finished exercise's goal after `steps` raises (+2 reps, or +5 s for a hold). */
export function keepGoal(goal: Goal, steps: number): Goal {
  return steps > 0 ? { ...goal, target: goal.target + steps * (goal.type === 'hold' ? 5 : 2) } : goal
}

/** Keep steps in force today: a raise made today starts next session. */
export function currentKeep(progress: Pick<Progress, 'keepStep' | 'keepRaisedOn'>, today: string): Record<string, number> {
  const out = { ...progress.keepStep }
  for (const [id, on] of Object.entries(progress.keepRaisedOn)) if (on === today && id in out) out[id] = Math.max(0, out[id] - 1)
  return out
}

/** Nodes with their keep steps applied (only finished exercises have any). */
export function applyKeep(nodes: ExerciseNode[], steps: Record<string, number>): ExerciseNode[] {
  if (Object.keys(steps).length === 0) return nodes
  return nodes.map((n) => (steps[n.id] ? { ...n, goal: keepGoal(n.goal, steps[n.id]) } : n))
}

/**
 * After today's sets of a finished exercise change: meeting its goal raises it for next time (once a day); removing or
 * fixing sets so it's no longer met undoes today's raise. `final` is its goal before any keep steps.
 */
export function settleKeep(progress: Progress, nodeId: string, final: Goal, today: string): Progress {
  if (!progress.completed.includes(nodeId)) return progress
  const st = progress.keepStep[nodeId] ?? 0
  const raisedToday = progress.keepRaisedOn[nodeId] === today
  const met = goalMet(keepGoal(final, raisedToday ? st - 1 : st), todaysValues(progress, nodeId, today))
  if (raisedToday && !met) {
    const keepStep = { ...progress.keepStep }
    const keepRaisedOn = { ...progress.keepRaisedOn }
    if (st - 1 > 0) keepStep[nodeId] = st - 1
    else delete keepStep[nodeId]
    delete keepRaisedOn[nodeId]
    return { ...progress, keepStep, keepRaisedOn }
  }
  if (!raisedToday && met) return { ...progress, keepStep: { ...progress.keepStep, [nodeId]: st + 1 }, keepRaisedOn: { ...progress.keepRaisedOn, [nodeId]: today } }
  return progress
}

/** Make an available strength exercise the branch's focus. Skill steps are started with `activateSkill`. */
export function setFocus(nodes: ExerciseNode[], progress: Progress, nodeId: string): Progress {
  const node = indexNodes(nodes).get(nodeId)
  if (!node || node.skill) return progress
  if (nodeState(node, progress, passedFor(nodes, progress)) !== 'available') return progress
  return rampNew(progress, { ...progress, focus: { ...progress.focus, [trackOf(node)]: nodeId } })
}

/** "I can already do this": complete the steps in order, each only if its requirements are met (passed) by then. */
export function completeSteps(nodes: ExerciseNode[], progress: Progress, ids: string[]): Progress {
  const byId = indexNodes(nodes)
  let completed = progress.completed
  for (const id of ids) {
    const n = byId.get(id)
    if (n && !completed.includes(id) && isUnlocked(n, passedSet(nodes, completed, kitOf(progress)))) completed = withTwins(nodes, [...completed, id], kitOf(progress))
  }
  if (completed === progress.completed) return progress
  return rampNew(progress, sanitizeProgress(nodes, { ...progress, completed }))
}

/** What you own (null = not set: everything counts). Training moves off anything you can no longer do; progress stays. */
export function setEquipment(nodes: ExerciseNode[], progress: Progress, kit: string[] | null): Progress {
  const settings = { ...progress.settings }
  if (kit) settings.equipment = [...new Set(kit)].filter((e) => e !== 'floor').sort()
  else delete settings.equipment
  return settleFocus(nodes, { ...progress, settings })
}

/** Start training a skill chain at its first trainable step. Refuses unknown, active, locked, finished chains and a 3rd skill. */
export function activateSkill(nodes: ExerciseNode[], progress: Progress, chainId: string): Progress {
  if (chainId in progress.skillFocus) return progress
  if (Object.keys(progress.skillFocus).length >= MAX_ACTIVE_SKILLS) return progress
  const step = firstStep(nodes, passedFor(nodes, progress), chainId, kitOf(progress))
  if (!step) return progress
  return rampNew(progress, { ...progress, skillFocus: { ...progress.skillFocus, [chainId]: step } })
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
  // your own goal replaces the exercise's build-up steps (the 60/80/100% ramp applies to it instead)
  return nodes.map((n) => (overrides[n.id] ? { ...n, steps: undefined, goal: { ...n.goal, sets: overrides[n.id].sets, target: overrides[n.id].target } } : n))
}

export function setDayType(progress: Progress, weekday: number, type: DayType): Progress {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !(type === 'rest' || PLAN_DAYS[progress.settings.plan].includes(type))) return progress
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

/** Nodes that were locked before a change and are unlocked (not passed) after it: the unlock moment. */
export function unlockedBy(nodes: ExerciseNode[], before: Progress, after: Progress): string[] {
  const b = passedFor(nodes, before)
  const a = passedFor(nodes, after)
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

/** Turn anything read from storage (including Plan 1 saves and pre-Plan 8 ids) into valid progress for the current graph. */
export function sanitizeProgress(nodes: ExerciseNode[], raw: unknown): Progress {
  const base = initialProgress(nodes)
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Record<string, unknown>
  const byId = indexNodes(nodes)
  const str = (x: unknown): x is string => typeof x === 'string'
  // ids from before Plan 8 move to the new trees; record which ones came from an old id
  const moved = new Set<string>()
  const cur = (id: string) => {
    const c = currentId(id)
    if (c !== id) moved.add(c)
    return c
  }
  const rekey = <T>(obj: unknown): Record<string, T> =>
    obj && typeof obj === 'object' ? Object.fromEntries(Object.entries(obj as Record<string, T>).map(([k, v]) => [currentId(k), v])) : {}

  const rs = r.settings as Partial<Settings> | undefined
  const settings: Settings = {
    holdSound: rs && typeof rs === 'object' && typeof rs.holdSound === 'boolean' ? rs.holdSound : true,
    length: rs && typeof rs === 'object' && WORKOUT_LENGTHS.includes(rs.length as WorkoutLength) ? (rs.length as WorkoutLength) : 'standard',
    plan: 'full',
    restTimer: true,
  }
  if (rs && typeof rs === 'object' && typeof rs.lastExportAt === 'number') settings.lastExportAt = rs.lastExportAt
  if (rs && typeof rs === 'object' && Array.isArray(rs.equipment)) settings.equipment = [...new Set(rs.equipment.filter(str))].filter((e) => e !== 'floor').sort()
  // Plan 9: an older save still on the old Push/Pull/Legs default moves to full body; a custom split stays and is offered it
  const rawSchedule = Array.isArray(r.schedule) && r.schedule.length === 7 && r.schedule.every((d) => DAY_TYPES.includes(d as DayType)) ? (r.schedule as DayType[]) : null
  const oldDefault = !rawSchedule || rawSchedule.every((d, i) => d === OLD_DEFAULT_SCHEDULE[i])
  if (rs && typeof rs === 'object' && (rs.plan === 'full' || rs.plan === 'ppl')) settings.plan = rs.plan
  else if (rawSchedule && !oldDefault && rawSchedule.some((d) => d === 'push' || d === 'pull' || d === 'legs')) {
    settings.plan = 'ppl'
    settings.offerFullBody = true
  }
  if (rs && typeof rs === 'object' && typeof rs.restTimer === 'boolean') settings.restTimer = rs.restTimer
  if (rs && typeof rs === 'object' && rs.offerFullBody === true && settings.plan === 'ppl') settings.offerFullBody = true
  const migrating = !(rs && typeof rs === 'object' && (rs.plan === 'full' || rs.plan === 'ppl'))
  const kit = settings.equipment

  const completed = Array.isArray(r.completed) ? [...new Set(r.completed.filter(str).map(cur).filter((x) => byId.has(x)))] : []
  const logs: SetLog[] = Array.isArray(r.logs)
    ? r.logs
        .filter(
          (l): l is SetLog =>
            !!l && typeof l === 'object' &&
            str((l as SetLog).nodeId) && !LEGACY_DROP_LOGS.has((l as SetLog).nodeId) && byId.has(currentId((l as SetLog).nodeId)) &&
            Number.isFinite((l as SetLog).value) &&
            str((l as SetLog).date) && typeof (l as SetLog).at === 'number',
        )
        .map((l) => ({ nodeId: currentId(l.nodeId), value: Math.floor(l.value), date: l.date, at: l.at }))
        .filter((l) => l.value >= 1)
    : []
  const rawFocus: Record<string, unknown> = Object.fromEntries(Object.entries(rekey<unknown>(r.focus)).map(([k, v]) => [k, str(v) ? cur(v) : v]))
  // an active skill keeps its place in its (possibly renamed) chain
  const rawSkill: Record<string, unknown> = {}
  for (const [chain, v] of Object.entries(r.skillFocus && typeof r.skillFocus === 'object' ? (r.skillFocus as Record<string, unknown>) : {})) {
    const id = str(v) ? cur(v) : null
    const key = (id && byId.get(id)?.skill) || LEGACY_CHAINS[chain] || chain
    if (!(key in rawSkill) || rawSkill[key] === null) rawSkill[key] = id
  }
  // Exercises that were a skill step before and are a track exercise now (Parallel bar dip → Dip, One-arm push-up)
  const converted = Object.values(rawSkill).map((id) => (str(id) ? byId.get(id) : undefined)).filter((n): n is ExerciseNode => !!n && !n.skill)

  // Older saves: the easier steps of the same tree below work you did (or were training) under an old id count
  // as done, so no one is sent back to a beginner move. New saves are never filled in.
  const legacyFocus = [...Object.values(rawFocus), ...Object.values(rawSkill)].filter(str).filter((id) => moved.has(id))
  const queue = [...completed.filter((id) => moved.has(id)), ...legacyFocus].map((id) => byId.get(id)).filter((n): n is ExerciseNode => !!n)
  const filled = new Set(completed)
  while (queue.length) {
    const n = queue.pop()!
    for (const req of n.requires) {
      const p = byId.get(req)
      if (p && p.tree && p.tree === n.tree && !filled.has(p.id)) {
        filled.add(p.id)
        completed.push(p.id)
        queue.push(p)
      }
    }
  }
  const allDone = withTwins(nodes, completed, kit)
  const done = passedSet(nodes, allDone, kit)

  const stored = [...Object.values(rawFocus), ...converted.map((n) => n.id)].filter(str).map((id) => byId.get(id))
  const focus: Record<string, string | null> = {}
  for (const t of trackKeys(nodes)) {
    const own = str(rawFocus[t]) ? byId.get(rawFocus[t] as string) : undefined
    // older saves keyed focus by branch or by an old track id: take any stored exercise that belongs to this track
    const pick = trainable(own, t, done, kit) ? own : stored.find((n) => trainable(n, t, done, kit))
    focus[t] = pick ? pick.id : pickFocus(nodes, done, t, kit)
  }

  const skillFocus: Record<string, string | null> = {}
  for (const chain of Object.keys(rawSkill)) {
    if (Object.keys(skillFocus).length >= MAX_ACTIVE_SKILLS) break
    if (!nodes.some((n) => n.skill === chain)) continue
    if (converted.some((n) => n.id === rawSkill[chain])) continue // its step is a track exercise now (see above)
    if (nodes.filter((n) => n.skill === chain).every((n) => done.has(n.id))) continue // finished chains are not active
    const st = str(rawSkill[chain]) ? byId.get(rawSkill[chain] as string) : undefined
    const ok = !!st && st.skill === chain && ready(st, done, kit)
    skillFocus[chain] = ok ? st!.id : firstStep(nodes, done, chain, kit)
  }

  // Plan 1 saves could hold a skill step as a branch focus: carry it over as an active skill when there is room
  for (const id of Object.values(rawFocus)) {
    const n = str(id) ? byId.get(id) : undefined
    if (!n?.skill || n.skill in skillFocus || Object.keys(skillFocus).length >= MAX_ACTIVE_SKILLS) continue
    const step = ready(n, done, kit) ? n.id : firstStep(nodes, done, n.skill, kit)
    if (step) skillFocus[n.skill] = step
  }

  // every training day takes a type of the plan (a full-body save switched to Push/Pull/Legs, or the other way)
  const scheduleIn = migrating && oldDefault ? base.schedule : rawSchedule ?? base.schedule
  const schedule = assignDays(scheduleIn.map((d) => (PLAN_DAYS[settings.plan].includes(d) ? d : 'rest')), scheduleIn.map((d) => d !== 'rest'), settings.plan)

  const goalOverrides: Record<string, GoalOverride> = {}
  for (const [id, g] of Object.entries(rekey<unknown>(r.goalOverrides))) {
    if (byId.has(id) && okOverride(g)) goalOverrides[id] = { sets: g.sets, target: g.target }
  }

  const goalStage: Record<string, number> = {}
  for (const [id, st] of Object.entries(rekey<unknown>(r.goalStage))) {
    if (byId.has(id) && Number.isInteger(st) && (st as number) >= 0 && (st as number) <= finalStage(byId.get(id)!.steps)) goalStage[id] = st as number
  }
  const stageRaisedOn: Record<string, string> = {}
  for (const [id, on] of Object.entries(rekey<unknown>(r.stageRaisedOn))) {
    if ((goalStage[id] ?? 0) >= 1 && str(on) && /^\d{4}-\d{2}-\d{2}$/.test(on)) stageRaisedOn[id] = on
  }
  const keepStep: Record<string, number> = {}
  for (const [id, st] of Object.entries(rekey<unknown>(r.keepStep))) {
    if (byId.has(id) && Number.isInteger(st) && (st as number) >= 1 && (st as number) <= 50) keepStep[id] = st as number
  }
  const keepRaisedOn: Record<string, string> = {}
  for (const [id, on] of Object.entries(rekey<unknown>(r.keepRaisedOn))) {
    if (keepStep[id] && str(on) && /^\d{4}-\d{2}-\d{2}$/.test(on)) keepRaisedOn[id] = on
  }
  const onboarded = typeof r.onboarded === 'boolean' ? r.onboarded : allDone.length > 0 || logs.length > 0
  const rd = r.day as Partial<DayState> | undefined
  const day: DayState | null =
    rd && typeof rd === 'object' && str(rd.date) && (rd.pick === null || DAY_TYPES.includes(rd.pick as DayType)) &&
    Array.isArray(rd.warm) && rd.warm.every(str)
      ? { date: rd.date, pick: rd.pick === null || PLAN_DAYS[settings.plan].includes(rd.pick as DayType) ? (rd.pick as DayType | null) : null, warm: [...rd.warm] }
      : null
  const seenAchievements = Array.isArray(r.seenAchievements) ? r.seenAchievements.filter(str) : null
  const out: Progress = { completed: allDone, focus, skillFocus, logs, schedule, goalOverrides, goalStage, stageRaisedOn, keepStep, keepRaisedOn, onboarded, seenAchievements, day, settings }
  // Plan 9 migration: what an older save trains starts at 60%, unless you already hit its full goal on some day
  if (!migrating) return out
  const metOnce = (id: string) => {
    const goal = goalOverrides[id] ? { ...byId.get(id)!.goal, ...goalOverrides[id] } : byId.get(id)!.goal
    return [...new Set(logs.filter((l) => l.nodeId === id).map((l) => l.date))].some((d) => goalMet(goal, todaysValues(out, id, d)))
  }
  const ramped = rampNew(null, out)
  for (const id of Object.keys(ramped.goalStage)) if (!(id in goalStage) && metOnce(id)) delete ramped.goalStage[id]
  return ramped
}
