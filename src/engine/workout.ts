import type { Branch, DayType, ExerciseNode, SkillChain } from '../data/types'
import { DAY_BRANCHES } from '../data/schedule'
import { indexNodes } from './graph'
import { goalMet, todaysValues, type Progress } from './progress'

export interface Workout {
  day: DayType
  /** current step of each active skill trained on this day type */
  skill: ExerciseNode[]
  /** focus exercise of each branch trained on this day type; null = branch finished */
  main: { branch: Branch; node: ExerciseNode | null }[]
}

export function buildWorkout(nodes: ExerciseNode[], progress: Progress, day: DayType, chains: SkillChain[]): Workout {
  const byId = indexNodes(nodes)
  const skill = Object.entries(progress.skillFocus).flatMap(([chain, id]) => {
    const node = id ? byId.get(id) : undefined
    return node && chains.find((c) => c.id === chain)?.day === day ? [node] : []
  })
  const main = DAY_BRANCHES[day].map((branch) => {
    const id = progress.focus[branch]
    return { branch, node: id ? byId.get(id) ?? null : null }
  })
  return { day, skill, main }
}

/** The next non-rest day after today (weekday 0 = Monday), wrapping into next week. `daysAhead` is 1 to 7. */
export function nextTrainingDay(schedule: DayType[], weekday: number): { daysAhead: number; day: DayType } | null {
  for (let ahead = 1; ahead <= 7; ahead++) {
    const day = schedule[(weekday + ahead) % 7]
    if (day !== 'rest') return { daysAhead: ahead, day }
  }
  return null
}

/** True when the workout has exercises and every one of them met its goal on `date`. */
export function workoutDone(workout: Workout, progress: Progress, date: string): boolean {
  const items = [...workout.skill, ...workout.main.flatMap((m) => (m.node ? [m.node] : []))]
  return items.length > 0 && items.every((n) => goalMet(n.goal, todaysValues(progress, n.id, date)))
}
