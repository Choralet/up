import type { DayType, ExerciseNode, SkillChain } from '../data/types'
import { ACCESSORY_TRACKS, DAY_TRACKS, FINISHER_TRACKS, FULL_SESSIONS, PULL_THIRD, SHORT_TRACKS } from '../data/tracks'
import { canDo } from './equipment'
import { indexNodes } from './graph'
import { weekStart } from '../lib/time'
import { kitOf, todaysValues, trackOf, type Progress, type WorkoutLength } from './progress'

export interface MainItem {
  track: string
  /** the exercise to train; null = nothing to train here today (see `needs`), or the track is finished */
  node: ExerciseNode | null
  /** the variation just finished below it */
  prev?: ExerciseNode
  /** full body: which pair (1, 2, 3) it belongs to; pairs are done alternately */
  pair?: number
  /** a finished exercise trained on: the track has nothing new you can do ("Keep building") */
  keep?: true
  /** equipment options the next exercise of the track needs (any one option, all its items) */
  needs?: string[][]
}

export interface Workout {
  day: DayType
  /** full body: session A or B */
  session?: 'A' | 'B'
  /** current step of each active skill trained today */
  skill: ExerciseNode[]
  main: MainItem[]
  /** a Volume variation and an accessory (Full length), and the core exercise (full body, or the Push/Pull finisher) */
  extra: { node: ExerciseNode; role: 'volume' | 'core' | 'accessory'; of?: string; prev?: ExerciseNode; track?: string }[]
}

/** Weeks since 1970 counted from Mondays. */
const weekNumber = (date: string) => {
  const [y, m, d] = weekStart(date).split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / (7 * 86_400_000))
}
const weekdayOf = (date: string) => (new Date(`${date}T12:00:00`).getDay() + 6) % 7

/**
 * A running count of training sessions: on a training day, its number; on a rest day, the next session's.
 * Full body alternates A/B on it (3 days: A-B-A, then B-A-B), and rotations (core, accessory) turn with it.
 */
export function sessionIndex(schedule: DayType[], date: string): number {
  const perWeek = schedule.filter((d) => d !== 'rest').length
  const before = schedule.slice(0, weekdayOf(date)).filter((d) => d !== 'rest').length
  return weekNumber(date) * Math.max(perWeek, 1) + before
}

const rotate = <T,>(list: T[], start: number): T[] => list.map((_, i) => list[(i + start) % list.length])

/** The deepest finished exercise of a track (what "Keep building" trains). */
function hardestDone(nodes: ExerciseNode[], done: Set<string>, track: string): ExerciseNode | undefined {
  const inTrack = nodes.filter((n) => !n.skill && trackOf(n) === track)
  const depth = (n: ExerciseNode): number => {
    const p = inTrack.find((x) => n.requires.includes(x.id))
    return p ? 1 + depth(p) : 0
  }
  return inTrack.filter((n) => done.has(n.id)).sort((a, b) => depth(b) - depth(a))[0]
}

/** What the track waits for: the equipment of the first exercise up its main line that you can't do. */
function neededGear(nodes: ExerciseNode[], progress: Progress, track: string): string[][] | undefined {
  const kit = kitOf(progress)
  const inTrack = nodes.filter((n) => !n.skill && trackOf(n) === track)
  const kids = (id: string | null) => inTrack.filter((n) => (id ? n.requires.includes(id) : !n.requires.some((r) => inTrack.some((x) => x.id === r))))
  const height = (n: ExerciseNode): number => 1 + Math.max(0, ...kids(n.id).map(height))
  for (let n = kids(null)[0]; n; n = kids(n.id).sort((a, b) => height(b) - height(a))[0]) {
    if (!progress.completed.includes(n.id) && !canDo(n, kit)) return n.equipment
  }
  return undefined
}

/**
 * The day's workout.
 * - Full body (`full`): your active skills, then three pairs (session A or B), then one core track in turn.
 *   Short = the first two pairs; Full adds a Volume variation per pair exercise and one accessory in turn.
 * - Push/Pull/Legs: Short = the first two tracks; Standard = every track of the day, a core finisher (in turn) on Push
 *   and Pull days, and a third Pull exercise (Biceps or Rear delts); Full adds Volume and an accessory of the day.
 * `date` picks the session (A/B) and the rotations. A track with nothing new you can do keeps its hardest finished
 * exercise ("Keep building") and says what it needs; a skill step and its twin show once.
 */
export function buildWorkout(nodes: ExerciseNode[], progress: Progress, day: DayType, chains: SkillChain[], length: WorkoutLength = 'standard', date?: string): Workout {
  const byId = indexNodes(nodes)
  const session = date ? sessionIndex(progress.schedule, date) : 0
  const skill = Object.entries(progress.skillFocus).flatMap(([chain, id]) => {
    const node = id ? byId.get(id) : undefined
    return node && (day === 'full' || chains.find((c) => c.id === chain)?.day === day) ? [node] : []
  })
  const done = new Set(progress.completed)
  // the variation you just finished below an exercise (none below a track's first exercise)
  const prevOf = (node: ExerciseNode | null, track: string) =>
    node?.requires.map((r) => byId.get(r)).find((p): p is ExerciseNode => !!p && !p.skill && trackOf(p) === track && done.has(p.id))
  // a skill step and its twin in a track are one exercise: list it once, as the skill (levelling it up moves both)
  const shown = new Set(skill.flatMap((n) => [n.id, ...(n.twins ?? [])]))
  const item = (track: string, pair?: number): MainItem[] => {
    const id = progress.focus[track]
    const focus = id ? byId.get(id) : undefined
    const at = pair ? { pair } : {}
    if (focus) {
      if (shown.has(focus.id)) return []
      const prev = prevOf(focus, track)
      return [prev ? { track, node: focus, prev, ...at } : { track, node: focus, ...at }]
    }
    const needs = neededGear(nodes, progress, track)
    const keep = hardestDone(nodes, done, track)
    if (keep && shown.has(keep.id)) return []
    const base: MainItem = keep ? { track, node: keep, keep: true, ...at } : { track, node: null, ...at }
    return [needs ? { ...base, needs } : base]
  }
  const open = (t: string) => !!progress.focus[t] && byId.has(progress.focus[t]!) && !shown.has(progress.focus[t]!)
  const extra: Workout['extra'] = []
  const core = (start: number) => {
    const track = rotate(FINISHER_TRACKS, start).find(open)
    if (!track) return
    const node = byId.get(progress.focus[track]!)!
    const prev = prevOf(node, track)
    extra.push(prev ? { node, role: 'core', prev } : { node, role: 'core' })
  }
  const accessory = (list: string[], turn: number) => {
    const avail = list.filter(open)
    if (!avail.length) return
    const track = avail[turn % avail.length]
    extra.push({ node: byId.get(progress.focus[track]!)!, role: 'accessory', track })
  }
  const volume = (main: MainItem[]) => {
    for (const m of main) if (m.node && m.prev && !m.keep) extra.push({ node: m.prev, role: 'volume', of: m.node.id })
  }

  if (day === 'full') {
    const letter = session % 2 === 0 ? 'A' : 'B'
    const pairs = FULL_SESSIONS[letter].slice(0, length === 'short' ? 2 : 3)
    const main = pairs.flatMap((tracks, i) => tracks.flatMap((t) => item(t, i + 1)))
    if (length === 'full') {
      volume(main)
      accessory(ACCESSORY_TRACKS.full, session)
    }
    if (length !== 'short') core(session)
    return { day, session: letter, skill, main, extra }
  }

  const tracks = length === 'short' ? SHORT_TRACKS[day] : DAY_TRACKS[day]
  const main = tracks.flatMap((t) => item(t))
  const week = date ? weekNumber(date) : 0
  if (length === 'full') volume(main)
  if (day === 'pull' && length !== 'short') accessory(PULL_THIRD, week)
  if (length === 'full') accessory(ACCESSORY_TRACKS[day].filter((t) => !extra.some((e) => e.track === t)), week)
  if (length !== 'short' && (day === 'push' || day === 'pull')) core(session)
  return { day, skill, main, extra }
}

/** Seconds of rest after a set: 2 min for skills, 90 s for strength (a pair rests once after both exercises). */
export const restSeconds = (node: ExerciseNode) => (node.kind === 'skill' ? 120 : 90)

/**
 * About how long the workout takes, in minutes (rounded to 5): a 5-minute warm-up, then each set's work (holds as
 * held, reps at about 3 s each) plus its rest; paired exercises share their rest.
 */
export function estimateMinutes(w: Workout): number {
  const per = (n: ExerciseNode, paired: boolean) => n.goal.sets * ((n.goal.type === 'hold' ? n.goal.target : n.goal.target * 3) * (n.goal.per ? 2 : 1) + restSeconds(n) / (paired ? 2 : 1))
  let sec = 5 * 60
  for (const n of w.skill) sec += per(n, false)
  for (const m of w.main) if (m.node) sec += per(m.node, !!m.pair)
  for (const e of w.extra) sec += per(e.node, false)
  return Math.max(5, Math.round(sec / 300) * 5)
}

/** The next non-rest day after today (weekday 0 = Monday), wrapping into next week. `daysAhead` is 1 to 7. */
export function nextTrainingDay(schedule: DayType[], weekday: number): { daysAhead: number; day: DayType } | null {
  for (let ahead = 1; ahead <= 7; ahead++) {
    const day = schedule[(weekday + ahead) % 7]
    if (day !== 'rest') return { daysAhead: ahead, day }
  }
  return null
}

/** Every exercise of the workout, in the order shown. */
export const workoutItems = (w: Workout): ExerciseNode[] => [...w.skill, ...w.main.flatMap((m) => (m.node ? [m.node] : [])), ...w.extra.map((e) => e.node)]

/**
 * True when the workout has exercises and each part has its sets logged on `date` (at any level).
 * A main exercise and its Volume variation count as one part, so levelling up mid-session
 * (the finished variation's sets are logged, the new focus is not) still completes the day.
 */
export function workoutDone(workout: Workout, progress: Progress, date: string): boolean {
  const logged = (n: ExerciseNode) => todaysValues(progress, n.id, date).length >= n.goal.sets
  const mains = workout.main.filter((m) => m.node)
  if (workout.skill.length + mains.length + workout.extra.length === 0) return false
  return (
    workout.skill.every(logged) &&
    // levelling up mid-session: the sets logged on the variation you just finished count for that track
    mains.every((m) => logged(m.node!) || (!!m.prev && logged(m.prev))) &&
    workout.extra.filter((e) => e.role === 'core').every((e) => logged(e.node) || (!!e.prev && logged(e.prev)))
  )
}

export interface SummaryLine {
  node: ExerciseNode
  sets: number
  best: number
  /** today's best beats every earlier day (only when there was an earlier day) */
  newBest: boolean
}

/** What you did on `date`, in the order you first logged each exercise. */
export function sessionSummary(byId: Map<string, ExerciseNode>, progress: Progress, date: string): SummaryLine[] {
  const order: string[] = []
  for (const l of progress.logs) if (l.date === date && !order.includes(l.nodeId) && byId.has(l.nodeId)) order.push(l.nodeId)
  return order.map((id) => {
    const today = todaysValues(progress, id, date)
    const earlier = progress.logs.filter((l) => l.nodeId === id && l.date < date).map((l) => l.value)
    const best = Math.max(...today)
    return { node: byId.get(id)!, sets: today.length, best, newBest: earlier.length > 0 && best > Math.max(...earlier) }
  })
}

/** Where the rep stepper starts: last session's first set, else today's last set, else the goal. */
export function stepperStart(progress: Progress, nodeId: string, today: string, goalTarget: number): { value: number; lastSession: number | null } {
  const mine = progress.logs.filter((l) => l.nodeId === nodeId)
  const prevDate = mine.filter((l) => l.date < today).map((l) => l.date).sort().pop()
  if (prevDate) {
    const first = mine.find((l) => l.date === prevDate)!.value
    return { value: first, lastSession: first }
  }
  const todays = mine.filter((l) => l.date === today)
  return { value: todays.length ? todays[todays.length - 1].value : goalTarget, lastSession: null }
}
