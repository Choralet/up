import type { DayType, ExerciseNode, SkillChain } from '../data/types'
import { DAY_TRACKS, FINISHER_TRACKS, SHORT_TRACKS } from '../data/tracks'
import { indexNodes } from './graph'
import { todaysValues, trackOf, type Progress, type WorkoutLength } from './progress'

export interface Workout {
  day: DayType
  /** current step of each active skill trained on this day type */
  skill: ExerciseNode[]
  /** focus exercise of each track trained today (null = track finished), and `prev`: the variation just finished below it */
  main: { track: string; node: ExerciseNode | null; prev?: ExerciseNode }[]
  /** "Also today": a Volume variation (Full length) and a core finisher on Push and Pull days */
  extra: { node: ExerciseNode; role: 'volume' | 'core'; of?: string; prev?: ExerciseNode }[]
}

/**
 * The day's workout. Short = the first two tracks; Standard = every track of the day plus a core finisher on
 * Push/Pull days; Full = Standard plus the finished variation of each main exercise for extra volume.
 */
export function buildWorkout(nodes: ExerciseNode[], progress: Progress, day: DayType, chains: SkillChain[], length: WorkoutLength = 'standard'): Workout {
  const byId = indexNodes(nodes)
  const skill = Object.entries(progress.skillFocus).flatMap(([chain, id]) => {
    const node = id ? byId.get(id) : undefined
    return node && chains.find((c) => c.id === chain)?.day === day ? [node] : []
  })
  const tracks = length === 'short' ? SHORT_TRACKS[day] : DAY_TRACKS[day]
  const done = new Set(progress.completed)
  // the variation you just finished below an exercise (none below a track's first exercise)
  const prevOf = (node: ExerciseNode | null, track: string) =>
    node?.requires.map((r) => byId.get(r)).find((p): p is ExerciseNode => !!p && !p.skill && trackOf(p) === track && done.has(p.id))
  const main = tracks.map((track) => {
    const id = progress.focus[track]
    const node = id ? byId.get(id) ?? null : null
    const prev = prevOf(node, track)
    return prev ? { track, node, prev } : { track, node }
  })
  const extra: Workout['extra'] = []
  if (length === 'full') {
    for (const m of main) if (m.node && m.prev) extra.push({ node: m.prev, role: 'volume', of: m.node.id })
  }
  const finisherTrack = FINISHER_TRACKS.find((t) => progress.focus[t])
  const core = finisherTrack ? byId.get(progress.focus[finisherTrack]!) : undefined
  if (length !== 'short' && (day === 'push' || day === 'pull') && core && finisherTrack) {
    const prev = prevOf(core, finisherTrack)
    extra.push(prev ? { node: core, role: 'core', prev } : { node: core, role: 'core' })
  }
  return { day, skill, main, extra }
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
